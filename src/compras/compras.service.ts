import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
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
    @InjectRepository(DetalleOrdenCompra)
    private readonly detalleOcRepository: Repository<DetalleOrdenCompra>,
    @InjectModel('AuditLog') private readonly auditModel: Model<any>,
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
      estado: 'PENDIENTE',
      subtotal: rest.subtotal || 0,
      impuestos: rest.impuestos || 0,
      total: rest.total || 0,
    });

    const ocGuardada = await this.ocRepository.save(nuevaOC) as OrdenCompra;
    const ocId = ocGuardada.id!;

    if (detalles && detalles.length > 0) {
      const detallesEntidad = detalles.map((d: any) => ({
        ordenCompraId: ocId,
        materialId: Number(d.materialId),
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        requerimientoDetalleId: d.requerimientoDetalleId || null,
        tiempoEntregaDias: d.tiempoEntregaDias || null,
        marca: d.marca || null,
        observaciones: d.observaciones || null,
      }));
      await this.detalleOcRepository.save(detallesEntidad);
    }

    return this.ocRepository.findOne({
      where: { id: ocId },
      relations: { detalles: true, proveedor: true },
    });
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

    if (orden.estado !== 'EMITIDA') {
      throw new BadRequestException(`Solo se pueden recibir órdenes en estado EMITIDA. Estado actual: ${orden.estado}`);
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
          observaciones: `Recepción de OC #${orden.codigo}`,
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
        detalles: { ordenId: id, codigo: orden.codigo, estado: orden.estado },
      });
    } catch (e) {
      this.logger.error('Error al registrar auditoría en MongoDB:', e);
    }

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_RECIBIDA',
      titulo: 'Orden de compra recibida',
      mensaje: `La orden de compra ${orden.codigo} fue recibida exitosamente. Stock actualizado.`,
      entidad: 'OrdenCompra',
      entidadId: String(id),
      rolDestino: 'ADMIN',
    });

    return { message: `Orden de compra ${orden.codigo} marcada como RECIBIDA y stock actualizado.` };
  }

  async aprobar(id: number): Promise<OrdenCompra> {
    const orden = await this.ocRepository.findOne({ where: { id } });

    if (!orden) {
      throw new NotFoundException(`Orden de compra #${id} no encontrada.`);
    }

    if (orden.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `Solo se pueden aprobar órdenes en estado PENDIENTE. Estado actual: ${orden.estado}`,
      );
    }

    orden.estado = 'EMITIDA';
    const ocActualizada = await this.ocRepository.save(orden);

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_APROBADA',
      titulo: 'Orden de compra aprobada',
      mensaje: `La orden de compra ${orden.codigo} fue aprobada por el administrador y está lista para ser gestionada.`,
      entidad: 'OrdenCompra',
      entidadId: String(id),
      rolDestino: 'COMPRADOR',
    });

    return ocActualizada;
  }

  async findAll() {
    return this.ocRepository.find({
      relations: { detalles: { material: true }, proveedor: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.ocRepository.findOne({
      where: { id },
      relations: { detalles: { material: true }, proveedor: true },
    });
  }

  async update(id: number, dto: any) {
    const orden = await this.ocRepository.findOne({ where: { id } });
    if (!orden) throw new NotFoundException(`Orden de compra #${id} no encontrada.`);

    if (orden.estado === 'RECIBIDA' || orden.estado === 'CANCELADA') {
      throw new BadRequestException(`No se puede editar una orden en estado ${orden.estado}`);
    }

    const { detalles, ...rest } = dto;
    await this.ocRepository.update(id, rest);

    if (detalles && Array.isArray(detalles)) {
      await this.detalleOcRepository.delete({ ordenCompraId: id });
      const detallesEntidad = detalles.map((d: any) => ({
        ordenCompraId: id,
        materialId: Number(d.materialId),
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        requerimientoDetalleId: d.requerimientoDetalleId || null,
      }));
      await this.detalleOcRepository.save(detallesEntidad);
    }

    return this.ocRepository.findOne({
      where: { id },
      relations: { detalles: { material: true }, proveedor: true },
    });
  }

  async remove(id: number) {
    const orden = await this.ocRepository.findOne({ where: { id } });
    if (!orden) throw new NotFoundException(`Orden de compra #${id} no encontrada.`);
    if (orden.estado === 'EMITIDA' || orden.estado === 'RECIBIDA') {
      throw new BadRequestException(`No se puede eliminar una orden en estado ${orden.estado}`);
    }
    await this.detalleOcRepository.delete({ ordenCompraId: id });
    await this.ocRepository.delete(id);
  }
}
