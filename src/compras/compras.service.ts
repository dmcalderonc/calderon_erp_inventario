import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { TipoMovimiento } from '../movimientos/entities/movimiento-inventario.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Requirement } from '../requirements/entities/requirement.entity';
import { RequirementDetail, ItemStatus } from '../requirements/entities/requirement-detail.entity';

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
    @InjectRepository(Requirement)
    private readonly reqRepository: Repository<Requirement>,
    @InjectRepository(RequirementDetail)
    private readonly reqDetalleRepository: Repository<RequirementDetail>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: any) {
    const { detalles, ...rest } = dto;

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

  async createFromRequirement(requirementId: number, dto: any) {
    const requirement = await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: { detalles: true, bodega: true, proyecto: true },
    });

    if (!requirement) {
      throw new NotFoundException(`Requerimiento #${requirementId} no encontrado`);
    }

    const itemsEnCompras = requirement.detalles.filter(
      d => d.estadoItem === ItemStatus.EN_COMPRAS,
    );

    if (itemsEnCompras.length === 0) {
      throw new BadRequestException('No hay ítems en estado EN_COMPRAS en este requerimiento');
    }

    const last = await this.ocRepository.findOne({ where: {}, order: { id: 'DESC' } });
    const nextNum = (last?.id ?? 0) + 1;
    const codigo = `OC-${String(nextNum).padStart(5, '0')}`;

    const nuevaOC = this.ocRepository.create({
      codigo,
      proveedorId: dto.proveedorId || null,
      fechaEmision: new Date().toISOString().split('T')[0],
      estado: 'PENDIENTE',
      bodegaDestinoId: requirement.bodegaId,
      subtotal: dto.subtotal || 0,
      impuestos: dto.impuestos || 0,
      total: dto.total || 0,
    });

    const ocGuardada = await this.ocRepository.save(nuevaOC) as OrdenCompra;

    const detallesEntidad = itemsEnCompras.map(det => ({
      ordenCompraId: ocGuardada.id!,
      materialId: Number(det.materialId),
      cantidad: Number(det.cantidadSolicitada),
      precioUnitario: 0,
      requerimientoDetalleId: det.id,
      tiempoEntregaDias: dto.tiempoEntregaDias || null,
      marca: dto.marca || null,
      observaciones: `REQ-${String(requirementId).padStart(3, '0')}`,
    }));
    await this.detalleOcRepository.save(detallesEntidad);

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_CREADA_DESDE_REQUERIMIENTO',
      titulo: 'OC creada desde requerimiento',
      mensaje: `Se creó la orden de compra ${codigo} a partir del REQ-${String(requirementId).padStart(3, '0')}. ${itemsEnCompras.length} ítems pendientes de compra.`,
      entidad: 'OrdenCompra',
      entidadId: String(ocGuardada.id),
      rolDestino: 'ADMIN',
    });

    return this.ocRepository.findOne({
      where: { id: ocGuardada.id },
      relations: { detalles: { material: true }, proveedor: true },
    });
  }

  async getItemsEnCompras() {
    const detallesEnCompras = await this.reqDetalleRepository.find({
      where: { estadoItem: ItemStatus.EN_COMPRAS },
      relations: {
        requirement: { bodega: true, proyecto: true, usuarioSolicitante: true },
        material: true,
      },
      order: { id: 'ASC' },
    });

    return detallesEnCompras;
  }

  async recibirItem(ocId: number, detalleId: number, cantidadRecibida: number, usuarioId: string, justificativo?: string, bodegaIds?: number[]) {
    const orden = await this.ocRepository.findOne({
      where: { id: ocId },
      relations: { detalles: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra #${ocId} no encontrada.`);
    }

    if (bodegaIds && bodegaIds.length > 0) {
      const bodegaOC = orden.bodegaDestinoId;
      if (bodegaOC && !bodegaIds.includes(bodegaOC)) {
        throw new ForbiddenException('No tiene permisos para recibir en esta bodega');
      }
    }

    if (orden.estado !== 'EMITIDA' && orden.estado !== 'RECIBIDA_PARCIAL') {
      throw new BadRequestException(
        `Solo se pueden recibir ítems de órdenes en estado EMITIDA o RECIBIDA_PARCIAL. Estado actual: ${orden.estado}`,
      );
    }

    const detalle = orden.detalles?.find(d => d.id === detalleId);
    if (!detalle) {
      throw new NotFoundException(`Detalle #${detalleId} no pertenece a la orden de compra #${ocId}.`);
    }

    const cantidadPendiente = Number(detalle.cantidad) - Number(detalle.cantidadRecibida || 0);
    if (cantidadRecibida <= 0) {
      throw new BadRequestException('La cantidad recibida debe ser mayor a 0.');
    }
    if (cantidadRecibida > cantidadPendiente) {
      throw new BadRequestException(
        `La cantidad recibida (${cantidadRecibida}) excede la cantidad pendiente (${cantidadPendiente}) para el ítem #${detalleId}.`,
      );
    }

    const tieneDiferencia = cantidadRecibida !== Number(detalle.cantidad);
    if (tieneDiferencia && !justificativo?.trim()) {
      throw new BadRequestException(
        `La cantidad recibida (${cantidadRecibida}) difiere de la ordenada (${Number(detalle.cantidad)}). Se requiere un justificativo.`,
      );
    }

    await this.movimientosService.registrarMovimiento(
      {
        tipo: TipoMovimiento.INGRESO,
        observaciones: `Recepción de ítem #${detalleId} de OC #${orden.codigo}`,
        bodegaDestinoId: orden.bodegaDestinoId || 1,
        detalles: [{ materialId: Number(detalle.materialId), cantidad: cantidadRecibida }],
      },
      usuarioId,
    );

    const nuevoRecibido = Number(detalle.cantidadRecibida || 0) + cantidadRecibida;
    await this.detalleOcRepository.update(detalleId, {
      cantidadRecibida: nuevoRecibido,
      justificativoRecepcion: justificativo?.trim() || null,
    });

    if (detalle.requerimientoDetalleId) {
      const reqDetalle = await this.reqDetalleRepository.findOne({
        where: { id: detalle.requerimientoDetalleId },
      });
      if (reqDetalle) {
        const despachadaActual = Number(reqDetalle.cantidadDespachada || 0);
        await this.reqDetalleRepository.update(reqDetalle.id, {
          cantidadDespachada: despachadaActual + cantidadRecibida,
        });
      }
    }

    const detallesActualizados = await this.detalleOcRepository.find({
      where: { ordenCompraId: ocId },
    });

    const todosRecibidos = detallesActualizados.every(d => Number(d.cantidadRecibida || 0) >= Number(d.cantidad));
    const algunoRecibido = detallesActualizados.some(d => Number(d.cantidadRecibida || 0) > 0);

    let nuevoEstado = orden.estado;
    if (todosRecibidos) {
      nuevoEstado = 'RECIBIDA';
    } else if (algunoRecibido) {
      nuevoEstado = 'RECIBIDA_PARCIAL';
    }
    await this.ocRepository.update(ocId, { estado: nuevoEstado });
    orden.estado = nuevoEstado;

    try {
      await this.auditModel.create({
        accion: 'RECIBIR_ITEM_OC',
        entidad: 'DetalleOrdenCompra',
        entidadId: String(detalleId),
        usuarioId,
        detalles: {
          ordenId: ocId,
          codigo: orden.codigo,
          detalleId,
          cantidadRecibida,
          cantidadOrdenada: Number(detalle.cantidad),
          tieneDiferencia,
          justificativo: justificativo?.trim() || null,
          nuevoEstado: orden.estado,
        },
      });
    } catch (e) {
      this.logger.error('Error al registrar auditoría en MongoDB:', e);
    }

    if (tieneDiferencia) {
      this.eventEmitter.emit('notificacion.crear', {
        tipo: 'RECEPCION_DIFERENCIA',
        titulo: 'Diferencia en recepción de OC',
        mensaje: `Se recibieron ${cantidadRecibida} uds del material #${detalle.materialId} en la OC ${orden.codigo}, pero se ordenaron ${Number(detalle.cantidad)}. Justificativo: "${justificativo}". Pendiente de revisión.`,
        entidad: 'OrdenCompra',
        entidadId: String(ocId),
        rolDestino: 'ADMIN',
      });
    }

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_ITEM_RECIBIDO',
      titulo: 'Ítem de OC recibido',
      mensaje: `Se recibió ${cantidadRecibida} uds del material #${detalle.materialId} en la OC ${orden.codigo}. Estado: ${orden.estado}.`,
      entidad: 'OrdenCompra',
      entidadId: String(ocId),
      rolDestino: 'ADMIN',
    });

    if (todosRecibidos) {
      this.eventEmitter.emit('notificacion.crear', {
        tipo: 'OC_COMPLETAMENTE_RECIBIDA',
        titulo: 'Orden de compra completamente recibida',
        mensaje: `La orden de compra ${orden.codigo} fue recibida en su totalidad. Stock actualizado.`,
        entidad: 'OrdenCompra',
        entidadId: String(ocId),
        rolDestino: 'SOLICITANTE',
      });
    }

    return {
      message: tieneDiferencia
        ? `Ítem #${detalleId} recibido con diferencia. Justificativo registrado. Estado OC: ${orden.estado}.`
        : `Ítem #${detalleId} recibido. Cantidad: ${cantidadRecibida}. Estado OC: ${orden.estado}.`,
      ocEstado: orden.estado,
      todosRecibidos,
      tieneDiferencia,
    };
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

    if (orden.estado !== 'EMITIDA' && orden.estado !== 'RECIBIDA_PARCIAL') {
      throw new BadRequestException(`Solo se pueden recibir órdenes en estado EMITIDA o RECIBIDA_PARCIAL. Estado actual: ${orden.estado}`);
    }

    const detallesSinRecibir = (orden.detalles || []).filter(d => Number(d.cantidadRecibida || 0) < Number(d.cantidad));
    if (detallesSinRecibir.length === 0) {
      throw new BadRequestException('Todos los ítems ya fueron recibidos.');
    }

    for (const det of detallesSinRecibir) {
      const cantidadPendiente = Number(det.cantidad) - Number(det.cantidadRecibida || 0);
      await this.detalleOcRepository.update(det.id, {
        cantidadRecibida: Number(det.cantidad),
      });

      if (det.requerimientoDetalleId) {
        const reqDetalle = await this.reqDetalleRepository.findOne({
          where: { id: det.requerimientoDetalleId },
        });
        if (reqDetalle) {
          const despachadaActual = Number(reqDetalle.cantidadDespachada || 0);
          await this.reqDetalleRepository.update(reqDetalle.id, {
            cantidadDespachada: despachadaActual + cantidadPendiente,
          });
        }
      }

      await this.movimientosService.registrarMovimiento(
        {
          tipo: TipoMovimiento.INGRESO,
          observaciones: `Recepción de ítem #${det.id} de OC #${orden.codigo}`,
          bodegaDestinoId: orden.bodegaDestinoId || 1,
          detalles: [{ materialId: Number(det.materialId), cantidad: cantidadPendiente }],
        },
        usuarioId,
      );
    }

    await this.ocRepository.update(id, { estado: 'RECIBIDA' });
    orden.estado = 'RECIBIDA';

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

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_COMPLETAMENTE_RECIBIDA',
      titulo: 'Orden de compra completamente recibida',
      mensaje: `La orden de compra ${orden.codigo} fue recibida en su totalidad. Stock actualizado.`,
      entidad: 'OrdenCompra',
      entidadId: String(id),
      rolDestino: 'SOLICITANTE',
    });

    return { message: `Orden de compra ${orden.codigo} marcada como RECIBIDA y stock actualizado.` };
  }

  async aprobar(id: number): Promise<OrdenCompra> {
    const orden = await this.ocRepository.findOne({
      where: { id },
      relations: { detalles: { material: true } },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra #${id} no encontrada.`);
    }

    if (orden.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `Solo se pueden aprobar órdenes en estado PENDIENTE. Estado actual: ${orden.estado}`,
      );
    }

    orden.estado = 'EMITIDA';
    await this.ocRepository.update(id, { estado: 'EMITIDA' });
    orden.estado = 'EMITIDA';

    const resumenItems = (orden.detalles || []).map(d => {
      const nombre = d.material?.nombre || `Material #${d.materialId}`;
      const sub = Number(d.cantidad) * Number(d.precioUnitario);
      return `${nombre}: ${d.cantidad} uds × $${Number(d.precioUnitario).toFixed(2)} = $${sub.toFixed(2)}`;
    }).join('\n');

    const totalStr = Number(orden.total) > 0 ? `Total: $${Number(orden.total).toFixed(2)}` : '';

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_APROBADA',
      titulo: 'Orden de compra aprobada',
      mensaje: `La OC ${orden.codigo} fue aprobada por el administrador.\n${resumenItems}\n${totalStr}\nPuedes proceder con la compra.`,
      entidad: 'OrdenCompra',
      entidadId: String(id),
      rolDestino: 'COMPRADOR',
    });

    this.eventEmitter.emit('notificacion.crear', {
      tipo: 'OC_PENDIENTE_RECEPCION',
      titulo: 'Orden de compra pendiente de recepción',
      mensaje: `La OC ${orden.codigo} fue aprobada y está pendiente de recepción.\n${resumenItems}\n${totalStr}`,
      entidad: 'OrdenCompra',
      entidadId: String(id),
      rolDestino: 'BODEGUERO',
    });

    return this.ocRepository.findOne({
      where: { id },
      relations: { detalles: { material: true }, proveedor: true },
    }) as Promise<OrdenCompra>;
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
