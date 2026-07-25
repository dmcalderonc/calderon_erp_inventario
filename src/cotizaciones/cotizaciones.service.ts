import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cotizacion, EstadoCotizacion } from './entities/cotizacion.entity';
import { RequirementDetail, ItemStatus } from '../requirements/entities/requirement-detail.entity';
import { Requirement } from '../requirements/entities/requirement.entity';
import { OrdenCompra } from '../compras/entities/orden-compra.entity';
import { DetalleOrdenCompra } from '../compras/entities/detalle-orden-compra.entity';
import { SolicitudCompra, EstadoSolicitud } from '../solicitudes-compra/entities/solicitud-compra.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CotizacionesService {
  private readonly logger = new Logger(CotizacionesService.name);

  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
    @InjectRepository(RequirementDetail)
    private readonly reqDetalleRepository: Repository<RequirementDetail>,
    @InjectRepository(Requirement)
    private readonly reqRepository: Repository<Requirement>,
    @InjectRepository(OrdenCompra)
    private readonly ocRepository: Repository<OrdenCompra>,
    @InjectRepository(DetalleOrdenCompra)
    private readonly detalleOcRepository: Repository<DetalleOrdenCompra>,
    @InjectRepository(SolicitudCompra)
    private readonly solicitudRepository: Repository<SolicitudCompra>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRequerimientosEnCompras() {
    const detallesEnCompras = await this.reqDetalleRepository.find({
      where: { estadoItem: ItemStatus.EN_COMPRAS },
      relations: {
        requirement: { bodega: true, proyecto: true, usuarioSolicitante: true },
        material: true,
      },
      order: { id: 'ASC' },
    });

    const reqMap = new Map<number, any>();
    for (const det of detallesEnCompras) {
      const reqId = det.requirement?.id ?? det.requerimientoId;
      if (!reqMap.has(reqId)) {
        reqMap.set(reqId, {
          requirement: det.requirement,
          detalles: [],
        });
      }
      reqMap.get(reqId).detalles.push(det);
    }

    return Array.from(reqMap.values());
  }

  async getCotizacionesByRequirement(requirementId: number) {
    const detalles = await this.reqDetalleRepository.find({
      where: { requerimientoId: requirementId },
      relations: { material: true },
    });

    const detalleIds = detalles.map(d => d.id);

    const cotizaciones = detalleIds.length > 0
      ? await this.cotizacionRepository.find({
          where: { requerimientoDetalleId: In(detalleIds) },
          relations: { proveedor: true, requerimientoDetalle: true },
          order: { id: 'ASC' },
        })
      : [];

    return { detalles, cotizaciones };
  }

  async create(dto: any): Promise<Cotizacion> {
    const detalle = await this.reqDetalleRepository.findOne({
      where: { id: dto.requerimientoDetalleId },
      relations: { requirement: true },
    });

    if (!detalle) {
      throw new NotFoundException(`Detalle de requerimiento #${dto.requerimientoDetalleId} no encontrado`);
    }

    if (detalle.estadoItem !== ItemStatus.EN_COMPRAS) {
      throw new BadRequestException('Solo se pueden crear cotizaciones para ítems en estado EN_COMPRAS');
    }

    const cotizacionesExistentes = await this.cotizacionRepository.find({
      where: { requerimientoDetalleId: dto.requerimientoDetalleId },
    });

    const tieneCotizacionActiva = cotizacionesExistentes.some(
      c => c.estado === EstadoCotizacion.EN_EVALUACION || c.estado === EstadoCotizacion.ELEGIDA,
    );
    if (tieneCotizacionActiva) {
      throw new BadRequestException(
        'Ya existe una cotización activa (EN_EVALUACION o ELEGIDA) para este detalle de requerimiento. No se puede crear otra.',
      );
    }

    const totalCotizado = cotizacionesExistentes.reduce((sum, c) => sum + Number(c.cantidad), 0) + Number(dto.cantidad);
    if (totalCotizado > Number(detalle.cantidadSolicitada)) {
      throw new BadRequestException(
        `La cantidad total cotizada (${totalCotizado}) excede la cantidad solicitada (${detalle.cantidadSolicitada})`,
      );
    }

    const nueva = this.cotizacionRepository.create({
      requerimientoDetalleId: dto.requerimientoDetalleId,
      proveedorId: dto.proveedorId,
      cantidad: Number(dto.cantidad),
      precioUnitario: Number(dto.precioUnitario),
      tiempoEntregaDias: dto.tiempoEntregaDias || null,
      marca: dto.marca || null,
      observaciones: dto.observaciones || null,
      archivoRespaldoUrl: dto.archivoRespaldoUrl || null,
      solicitudCompraId: dto.solicitudCompraId || null,
      estado: EstadoCotizacion.EN_EVALUACION,
    });

    const cotizacionGuardada = await this.cotizacionRepository.save(nueva) as Cotizacion;

    if (dto.solicitudCompraId) {
      const solicitud = await this.solicitudRepository.findOneBy({ id: dto.solicitudCompraId });
      if (solicitud && solicitud.estado === EstadoSolicitud.PENDIENTE) {
        solicitud.estado = EstadoSolicitud.COTIZANDO;
        await this.solicitudRepository.save(solicitud);
      }
    }

    return cotizacionGuardada;
  }

  async update(id: number, dto: any): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    if (cotizacion.estado === EstadoCotizacion.ELEGIDA) {
      throw new BadRequestException('No se puede editar una cotización ya seleccionada');
    }

    if (dto.cantidad && cotizacion.requerimientoDetalleId) {
      const detalle = await this.reqDetalleRepository.findOne({
        where: { id: cotizacion.requerimientoDetalleId },
      });
      if (detalle) {
        const otras = await this.cotizacionRepository.find({
          where: { requerimientoDetalleId: cotizacion.requerimientoDetalleId },
        });
        const totalOtras = otras
          .filter(c => c.id !== id)
          .reduce((sum, c) => sum + Number(c.cantidad), 0) + Number(dto.cantidad);
        if (totalOtras > Number(detalle.cantidadSolicitada)) {
          throw new BadRequestException(
            `La cantidad total cotizada (${totalOtras}) excede la cantidad solicitada (${detalle.cantidadSolicitada})`,
          );
        }
      }
    }

    Object.assign(cotizacion, dto);
    return await this.cotizacionRepository.save(cotizacion);
  }

  async remove(id: number): Promise<void> {
    const cotizacion = await this.findOne(id);
    if (cotizacion.estado === EstadoCotizacion.ELEGIDA) {
      throw new BadRequestException('No se puede eliminar una cotización ya seleccionada');
    }
    await this.cotizacionRepository.remove(cotizacion);
  }

  async seleccionar(id: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    if (cotizacion.estado !== EstadoCotizacion.EN_EVALUACION) {
      throw new BadRequestException(
        `Solo se pueden seleccionar cotizaciones en estado EN_EVALUACION. Estado actual: ${cotizacion.estado}`,
      );
    }
    cotizacion.estado = EstadoCotizacion.ELEGIDA;
    return await this.cotizacionRepository.save(cotizacion);
  }

  async descartar(id: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    cotizacion.estado = EstadoCotizacion.DESCARTADA;
    return await this.cotizacionRepository.save(cotizacion);
  }

  async generarOC(requirementId: number) {
    const requirement = await this.reqRepository.findOne({
      where: { id: requirementId },
      relations: { detalles: true, bodega: true, proyecto: true },
    });

    if (!requirement) throw new NotFoundException(`Requerimiento #${requirementId} no encontrado`);

    const detalleIds = requirement.detalles.map(d => d.id);
    if (detalleIds.length === 0) throw new BadRequestException('El requerimiento no tiene detalles');

    const cotizacionesElegidas = await this.cotizacionRepository.find({
      where: {
        requerimientoDetalleId: In(detalleIds),
        estado: EstadoCotizacion.ELEGIDA,
      },
      relations: { proveedor: true, requerimientoDetalle: true },
    });

    if (cotizacionesElegidas.length === 0) {
      throw new BadRequestException('No hay cotizaciones seleccionadas (ELEGIDA) para generar la OC');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const last = await queryRunner.manager.findOne(OrdenCompra, {
        where: {},
        order: { id: 'DESC' },
      });
      const nextNum = (last?.id ?? 0) + 1;
      const codigo = `OC-${String(nextNum).padStart(5, '0')}`;

      let subtotal = 0;
      for (const cot of cotizacionesElegidas) {
        subtotal += Number(cot.cantidad) * Number(cot.precioUnitario);
      }
      const impuestos = subtotal * 0.15;
      const total = subtotal + impuestos;

      const nuevaOC = queryRunner.manager.create(OrdenCompra, {
        codigo,
        fechaEmision: new Date().toISOString().split('T')[0],
        estado: 'PENDIENTE',
        bodegaDestinoId: requirement.bodegaId,
        subtotal,
        impuestos,
        total,
      });
      const ocGuardada = await queryRunner.manager.save(nuevaOC) as OrdenCompra;

      const detallesOC = cotizacionesElegidas.map(cot => ({
        ordenCompraId: ocGuardada.id!,
        materialId: Number(cot.requerimientoDetalle?.materialId ?? cot.requerimientoDetalleId),
        cantidad: Number(cot.cantidad),
        precioUnitario: Number(cot.precioUnitario),
        requerimientoDetalleId: cot.requerimientoDetalleId,
        tiempoEntregaDias: cot.tiempoEntregaDias || null,
        marca: cot.marca || null,
        observaciones: cot.observaciones || null,
      }));

      for (const det of detallesOC) {
        const detEntidad = queryRunner.manager.create(DetalleOrdenCompra, det);
        await queryRunner.manager.save(detEntidad);
      }

      await queryRunner.commitTransaction();

      const itemsDetalle = cotizacionesElegidas.map(cot => {
        const materialNombre = cot.requerimientoDetalle?.material?.nombre || `Material #${cot.requerimientoDetalle?.materialId}`;
        const sub = Number(cot.cantidad) * Number(cot.precioUnitario);
        return `${materialNombre}: ${cot.cantidad} uds × $${Number(cot.precioUnitario).toFixed(2)} = $${sub.toFixed(2)}`;
      }).join('\n');

      this.eventEmitter.emit('notificacion.crear', {
        tipo: 'OC_GENERADA',
        titulo: 'Orden de compra generada',
        mensaje: `Se generó la OC ${codigo} desde REQ-${String(requirementId).padStart(3, '0')}. ${cotizacionesElegidas.length} ítems.\n${itemsDetalle}\nSubtotal: $${subtotal.toFixed(2)} | Impuestos (15%): $${impuestos.toFixed(2)} | Total: $${total.toFixed(2)}.\nPendiente de aprobación.`,
        entidad: 'OrdenCompra',
        entidadId: String(ocGuardada.id),
        rolDestino: 'ADMIN',
      });

      return this.ocRepository.findOne({
        where: { id: ocGuardada.id },
        relations: { detalles: { material: true }, proveedor: true },
      });
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: number): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id },
      relations: { proveedor: true, requerimientoDetalle: { material: true } },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización #${id} no encontrada`);
    }
    return cotizacion;
  }

  async findAll(): Promise<Cotizacion[]> {
    return await this.cotizacionRepository.find({
      relations: { proveedor: true, requerimientoDetalle: { material: true } },
      order: { id: 'DESC' },
    });
  }
}
