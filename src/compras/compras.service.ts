import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdenCompra } from './entities/orden-compra.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { Cotizacion, EstadoCotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { TipoMovimiento } from '../movimientos/entities/movimiento-inventario.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
@Injectable()
export class ComprasService {
  private readonly logger = new Logger(ComprasService.name);

  constructor(
    @InjectRepository(OrdenCompra)
    private readonly ocRepository: Repository<OrdenCompra>,
    @InjectModel('AuditLog') private readonly auditModel: Model<any>,
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(dto: any) {
    const { solicitudId, detalles, ...rest } = dto;

    if (solicitudId) {
      const cotizacion = await this.cotizacionRepository.findOne({
        where: { solicitudId },
      });

      if (!cotizacion) {
        throw new ForbiddenException('No existe cotización asociada a esta solicitud.');
      }

      if (cotizacion.estado !== EstadoCotizacion.ELEGIDA) {
        throw new ForbiddenException('La cotización asociada aún no ha sido aprobada.');
      }
    }

    const last = await this.ocRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });
    const nextNum = (last?.id ?? 0) + 1;
    const codigo = `OC-${String(nextNum).padStart(5, '0')}`;

    const nuevaOC = this.ocRepository.create({
      ...rest,
      codigo,
      fechaEmision: rest.fechaEmision || new Date().toISOString().split('T')[0],
      estado: 'BORRADOR',
      detalles: (detalles || []).map((d: any) => ({
        materialId: Number(d.materialId),
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
      })),
    });

    return this.ocRepository.save(nuevaOC);
  }

  async recibirOrden(id: number, usuarioId: string) {
    const orden = await this.ocRepository.findOne({
      where: { id },
      relations: { detalles: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra #${id} no encontrada.`);
    }

    if (orden.estado === 'RECIBIDA') {
      throw new BadRequestException(`La orden de compra #${id} ya fue recibida.`);
    }

    const todosCompletos = (orden.detalles || []).every(
      (d) => Number(d.cantidad) > 0,
    );

    orden.estado = todosCompletos ? 'RECIBIDA' : 'RECIBIDA_PARCIAL';
    await this.ocRepository.save(orden);

    const detallesMovimiento = (orden.detalles || []).map(d => ({
      materialId: Number(d.materialId),
      cantidad: Number(d.cantidad),
    }));

    if (detallesMovimiento.length > 0) {
      await this.movimientosService.registrarMovimiento(
        {
          tipo: TipoMovimiento.INGRESO,
          observaciones: `Recepción de OC #${id}`,
          bodegaDestinoId: orden.bodegaDestinoId || 1,
          detalles: detallesMovimiento,
        },
        usuarioId,
      );
      this.eventEmitter.emit('orden.recibida', {
        detalles: detallesMovimiento,
      });
    }

    try {
      await this.auditModel.create({
        accion: 'RECIBIR_ORDEN_COMPRA',
        entidad: 'OrdenCompra',
        entidadId: id.toString(),
        usuarioId,
        detalles: { ordenId: id, estado: orden.estado },
      });
    } catch (e) {
      this.logger.error('Error al registrar auditoría en MongoDB:', e);
    }

    return { message: `Orden de compra #${id} marcada como ${orden.estado} y stock actualizado.` };
  }

  async aprobar(id: number): Promise<OrdenCompra> {
    const orden = await this.ocRepository.findOne({ where: { id } });

    if (!orden) {
      throw new NotFoundException(`Orden de compra #${id} no encontrada.`);
    }

    if (orden.estado !== 'BORRADOR') {
      throw new BadRequestException(
        `Solo se pueden aprobar órdenes en estado BORRADOR. Estado actual: ${orden.estado}`,
      );
    }

    orden.estado = 'EMITIDA';
    return await this.ocRepository.save(orden);
  }

  async findAll() {
    return this.ocRepository.find({
      relations: { detalles: true, proveedor: true },
    });
  }

  async findOne(id: number) {
    return this.ocRepository.findOne({
      where: { id },
      relations: { detalles: true, proveedor: true },
    });
  }

  async update(id: number, dto: any) {
    const { proveedorId, ...rest } = dto;
    await this.ocRepository.update(id, rest);
    return this.ocRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.ocRepository.delete(id);
  }
}
