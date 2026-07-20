import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdenCompra } from './entities/orden-compra.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { Cotizacion, EstadoCotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { TipoMovimiento } from '../movimientos/entities/movimiento-inventario.entity';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(OrdenCompra)
    private readonly ocRepository: Repository<OrdenCompra>,
    @InjectModel('AuditLog') private readonly auditModel: Model<any>,
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
  ) { }

  async create(dto: any) {
    const { solicitudId, ...rest } = dto;

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

    const nuevaOC = this.ocRepository.create({
      ...rest,
      estado: 'BORRADOR',
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

    orden.estado = 'RECIBIDA';
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
          bodegaDestinoId: 1,
          detalles: detallesMovimiento,
        },
        usuarioId,
      );
    }

    try {
      await this.auditModel.create({
        accion: 'RECIBIR_ORDEN_COMPRA',
        entidad: 'OrdenCompra',
        entidadId: id.toString(),
        usuarioId,
        detalles: { ordenId: id, estado: 'RECIBIDA' },
      });
    } catch (e) {
      console.error('Error al registrar auditoría en MongoDB:', e);
    }

    return { message: `Orden de compra #${id} marcada como recibida y stock actualizado.` };
  }

  async findAll() {
    return this.ocRepository.find({
      relations: { detalles: true },
    });
  }

  async findOne(id: number) {
    return this.ocRepository.findOne({
      where: { id },
      relations: { detalles: true },
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
