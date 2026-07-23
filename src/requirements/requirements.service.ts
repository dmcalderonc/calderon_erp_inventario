import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, FindOptionsWhere, In } from 'typeorm';
import { Requirement, RequirementStatus } from './entities/requirement.entity';
import { RequirementDetail, ItemStatus } from './entities/requirement-detail.entity';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { Inventario } from '../inventario/inventario.entity';
import { Traspaso, EstadoTraspaso } from '../traspasos/entities/traspaso.entity';
import { DetalleTraspaso } from '../traspasos/entities/detalle-traspaso.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private reqRepository: Repository<Requirement>,
    @InjectRepository(RequirementDetail)
    private detalleRepository: Repository<RequirementDetail>,
    @InjectRepository(Inventario)
    private inventarioRepository: Repository<Inventario>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createDto: CreateRequirementDto, userId: string) {
    const requirement = this.reqRepository.create({
      proyectoId: createDto.proyectoId,
      usuarioSolicitanteId: userId,
      bodegaId: createDto.bodegaId,
      estado: RequirementStatus.PENDIENTE,
      detalles: createDto.detalles.map((detalle) => ({
        materialId: detalle.materialId,
        cantidadSolicitada: detalle.cantidadSolicitada,
      })),
    });

    return await this.reqRepository.save(requirement);
  }

  async evaluarItem(
    id: number,
    detalleId: number,
    accion: 'APROBADO' | 'RECHAZADO',
    userId: string,
  ) {
    const req = await this.reqRepository.findOne({
      where: { id },
      relations: { detalles: true, bodega: true },
    });

    if (!req) throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    if (req.estado !== RequirementStatus.PENDIENTE) {
      throw new BadRequestException('Solo se pueden evaluar requerimientos en estado PENDIENTE');
    }

    const detalle = req.detalles.find(d => d.id === detalleId);
    if (!detalle) throw new NotFoundException(`Detalle #${detalleId} no encontrado`);
    if (detalle.estadoItem !== ItemStatus.PENDIENTE) {
      throw new BadRequestException(`El ítem #${detalleId} ya fue evaluado`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (accion === 'RECHAZADO') {
        detalle.estadoItem = ItemStatus.RECHAZADO;
        await queryRunner.manager.save(detalle);
      } else {
        await this.aprobarItem(detalle, req.bodegaId, queryRunner.manager);
      }

      await this.recalcularEstadoMaestro(id, queryRunner.manager);
      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async aprobarItem(
    detalle: RequirementDetail,
    bodegaSolicitadaId: number,
    manager: EntityManager,
  ) {
    const stockSolicitada = await manager.findOne(Inventario, {
      where: { materialId: detalle.materialId, bodegaId: bodegaSolicitadaId },
    });

    const stockDisponible = stockSolicitada
      ? (stockSolicitada.cantidad_disponible || 0) - (stockSolicitada.cantidad_reservada || 0)
      : 0;

    const cantidadReq = Number(detalle.cantidadSolicitada);

    // Case 1: Enough stock in requested warehouse
    if (stockDisponible >= cantidadReq) {
      stockSolicitada.cantidad_reservada = (stockSolicitada.cantidad_reservada || 0) + cantidadReq;
      stockSolicitada.cantidad_disponible = (stockSolicitada.cantidad_disponible || 0) - cantidadReq;
      await manager.save(stockSolicitada);

      detalle.estadoItem = ItemStatus.APROBADO_BODEGA;
      await manager.save(detalle);
      return;
    }

    // Case 2: Partial stock in requested warehouse
    if (stockDisponible > 0) {
      const cantidadFaltante = cantidadReq - stockDisponible;

      // Reserve what's available
      stockSolicitada.cantidad_reservada = (stockSolicitada.cantidad_reservada || 0) + stockDisponible;
      stockSolicitada.cantidad_disponible = (stockSolicitada.cantidad_disponible || 0) - stockDisponible;
      await manager.save(stockSolicitada);

      // Create a new detail for the available portion
      const nuevoDetalle = manager.create(RequirementDetail, {
        requerimientoId: detalle.requerimientoId,
        materialId: detalle.materialId,
        cantidadSolicitada: stockDisponible,
        cantidadDespachada: 0,
        estadoItem: ItemStatus.APROBADO_BODEGA,
      });
      await manager.save(nuevoDetalle);

      // Update original with the shortage
      detalle.cantidadSolicitada = cantidadFaltante;
      await this.buscarStockEnOtrasBodegas(detalle, bodegaSolicitadaId, manager);
      return;
    }

    // Case 3: No stock in requested warehouse — search other warehouses
    await this.buscarStockEnOtrasBodegas(detalle, bodegaSolicitadaId, manager);
  }

  private async buscarStockEnOtrasBodegas(
    detalle: RequirementDetail,
    bodegaSolicitadaId: number,
    manager: EntityManager,
  ) {
    const inventarios = await manager.find(Inventario, {
      where: { materialId: detalle.materialId },
      relations: { bodega: true },
      order: { id: 'ASC' },
    });

    const cantidadReq = Number(detalle.cantidadSolicitada);

    for (const inv of inventarios) {
      if (inv.bodegaId === bodegaSolicitadaId) continue;

      const disponible = (inv.cantidad_disponible || 0) - (inv.cantidad_reservada || 0);
      if (disponible >= cantidadReq) {
        // Found enough stock in another warehouse — create automatic transfer
        await this.crearTraspasoAutomatico(detalle, inv.bodegaId, manager);
        return;
      }
    }

    // No warehouse has enough stock — send to purchases
    detalle.estadoItem = ItemStatus.EN_COMPRAS;
    await manager.save(detalle);

    const requerimiento = await manager.findOne(Requirement, {
      where: { id: detalle.requerimientoId },
    });

    this.eventEmitter.emit('requerimiento.en_compras', {
      requirementId: detalle.requerimientoId,
      materialId: detalle.materialId,
      cantidad: cantidadReq,
      proyectoId: requerimiento?.proyectoId,
    });
  }

  private async crearTraspasoAutomatico(
    detalle: RequirementDetail,
    bodegaOrigenId: number,
    manager: EntityManager,
  ) {
    const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const codigo = `TRASP-${suffix}`;

    const traspaso = manager.create(Traspaso, {
      codigo,
      bodegaOrigenId,
      bodegaDestinoId: (await manager.findOne(Requirement, { where: { id: detalle.requerimientoId } }))?.bodegaId,
      usuarioOrigenId: 'SYSTEM',
      estado: EstadoTraspaso.PENDIENTE,
      requerimientoDetalleId: detalle.id,
      detalles: [{
        materialId: detalle.materialId,
        cantidad: Number(detalle.cantidadSolicitada),
        cantidadRecibida: 0,
      }],
    });
    await manager.save(traspaso);

    detalle.estadoItem = ItemStatus.EN_TRASLADO;
    await manager.save(detalle);
  }

  async updateStatus(
    id: number,
    updateDto: UpdateRequirementDto,
    userId: string,
    rol: string,
  ) {
    if (rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un Administrador puede cambiar el estado general del requerimiento');
    }

    const req = await this.reqRepository.findOne({
      where: { id },
      relations: { detalles: true, bodega: true },
    });

    if (!req) throw new NotFoundException(`Requerimiento #${id} no encontrado`);

    // Allow marking as ATENDIDO (dispatch) when APROBADO
    if (updateDto.estado === RequirementStatus.ATENDIDO && req.estado === RequirementStatus.APROBADO) {
      return this.despacharRequerimiento(req);
    }

    // Allow bulk rejection (rejects all pending items)
    if (updateDto.estado === RequirementStatus.RECHAZADO && req.estado === RequirementStatus.PENDIENTE) {
      return this.rechazarRequerimiento(req);
    }

    throw new BadRequestException(
      `Transición no válida: ${req.estado} → ${updateDto.estado}`,
    );
  }

  private async despacharRequerimiento(req: Requirement) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const det of req.detalles) {
        if (det.estadoItem !== ItemStatus.APROBADO_BODEGA) continue;

        const cantidadDespachada = Number(det.cantidadDespachada || det.cantidadSolicitada);
        det.cantidadDespachada = cantidadDespachada;
        det.estadoItem = ItemStatus.DESPACHADO;
        await queryRunner.manager.save(det);
      }

      await this.recalcularEstadoMaestro(req.id, queryRunner.manager);
      await queryRunner.commitTransaction();
      return this.findOne(req.id);
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async rechazarRequerimiento(req: Requirement) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const det of req.detalles) {
        if (det.estadoItem === ItemStatus.RECHAZADO || det.estadoItem === ItemStatus.DESPACHADO) continue;

        // Return reserved stock if applicable
        if (det.estadoItem === ItemStatus.APROBADO_BODEGA) {
          const cantidadReservada = Number(det.cantidadSolicitada);
          await queryRunner.manager.decrement(
            Inventario,
            { materialId: Number(det.materialId), bodegaId: req.bodegaId },
            'cantidad_reservada',
            cantidadReservada,
          );
          await queryRunner.manager.increment(
            Inventario,
            { materialId: Number(det.materialId), bodegaId: req.bodegaId },
            'cantidad_disponible',
            cantidadReservada,
          );
        }

        det.estadoItem = ItemStatus.RECHAZADO;
        await queryRunner.manager.save(det);
      }

      req.estado = RequirementStatus.RECHAZADO;
      await queryRunner.manager.save(req);
      await queryRunner.commitTransaction();
      return this.findOne(req.id);
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId?: string, rol?: string) {
    const where: FindOptionsWhere<Requirement> = {};

    if (rol === 'SOLICITANTE' && userId) {
      where.usuarioSolicitanteId = userId;
    }

    if (rol === 'COMPRADOR') {
      where.estado = RequirementStatus.APROBADO;
    }

    return await this.reqRepository.find({
      where,
      relations: {
        detalles: { material: true },
        proyecto: true,
        usuarioSolicitante: true,
        bodega: true,
      },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number, userId?: string, rol?: string) {
    const where: FindOptionsWhere<Requirement> = { id };
    if (rol === 'SOLICITANTE' && userId) {
      where.usuarioSolicitanteId = userId;
    }
    return await this.reqRepository.findOne({
      where,
      relations: {
        detalles: { material: true },
        proyecto: true,
        usuarioSolicitante: true,
        bodega: true,
      },
    });
  }

  async remove(id: number) {
    return await this.reqRepository.delete(id);
  }

  @OnEvent('orden.recibida')
  async handleOrdenRecibida(payload: { detalles: { materialId: number; cantidad: number }[] }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const requerimientosModificadosIds = new Set<number>();
      const materialIdsRecibidos = payload.detalles.map(d => d.materialId);

      const requerimientos = await queryRunner.manager
        .createQueryBuilder(Requirement, 'req')
        .innerJoinAndSelect('req.detalles', 'det')
        .where('det.estadoItem = :status', { status: ItemStatus.EN_COMPRAS })
        .andWhere('det.materialId IN (:...materialIds)', { materialIds: materialIdsRecibidos })
        .orderBy('req.id', 'ASC')
        .getMany();

      for (const req of requerimientos) {
        const detallesDormidos = req.detalles.filter(
          d =>
            materialIdsRecibidos.includes(Number(d.materialId)) &&
            d.estadoItem === ItemStatus.EN_COMPRAS,
        );

        for (const det of detallesDormidos) {
          const cantidadNecesitada = Number(det.cantidadSolicitada);

          const stockBodega = await queryRunner.manager.findOne(Inventario, {
            where: { materialId: det.materialId, bodegaId: req.bodegaId },
          });

          const stockLibre = stockBodega
            ? (stockBodega.cantidad_disponible || 0) - (stockBodega.cantidad_reservada || 0)
            : 0;

          if (stockLibre <= 0) continue;

          if (stockLibre >= cantidadNecesitada) {
            det.estadoItem = ItemStatus.APROBADO_BODEGA;
            await queryRunner.manager.save(det);

            if (stockBodega) {
              stockBodega.cantidad_disponible = (stockBodega.cantidad_disponible || 0) - cantidadNecesitada;
              stockBodega.cantidad_reservada = (stockBodega.cantidad_reservada || 0) + cantidadNecesitada;
              await queryRunner.manager.save(stockBodega);
            }

            requerimientosModificadosIds.add(req.id);
          } else {
            const cantidadRestante = cantidadNecesitada - stockLibre;

            det.cantidadSolicitada = stockLibre;
            det.estadoItem = ItemStatus.APROBADO_BODEGA;
            await queryRunner.manager.save(det);

            const nuevoDetalle = queryRunner.manager.create(RequirementDetail, {
              requerimientoId: det.requerimientoId,
              materialId: det.materialId,
              cantidadSolicitada: cantidadRestante,
              cantidadDespachada: 0,
              estadoItem: ItemStatus.EN_COMPRAS,
            });
            await queryRunner.manager.save(nuevoDetalle);

            if (stockBodega) {
              stockBodega.cantidad_disponible = (stockBodega.cantidad_disponible || 0) - stockLibre;
              stockBodega.cantidad_reservada = (stockBodega.cantidad_reservada || 0) + stockLibre;
              await queryRunner.manager.save(stockBodega);
            }

            requerimientosModificadosIds.add(req.id);
          }
        }
      }

      for (const idReq of requerimientosModificadosIds) {
        await this.recalcularEstadoMaestro(idReq, queryRunner.manager);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async recalcularEstadoMaestro(reqId: number, manager: EntityManager) {
    const req = await manager.findOne(Requirement, {
      where: { id: reqId },
      relations: { detalles: true },
    });

    if (!req || !req.detalles || req.detalles.length === 0) return;

    const total = req.detalles.length;
    const rechazados = req.detalles.filter(d => d.estadoItem === ItemStatus.RECHAZADO).length;
    const despachados = req.detalles.filter(d => d.estadoItem === ItemStatus.DESPACHADO).length;
    const pendientes = req.detalles.filter(d =>
      d.estadoItem === ItemStatus.PENDIENTE ||
      d.estadoItem === ItemStatus.APROBADO_BODEGA ||
      d.estadoItem === ItemStatus.EN_COMPRAS ||
      d.estadoItem === ItemStatus.EN_TRASLADO,
    ).length;

    if (rechazados === total) {
      req.estado = RequirementStatus.RECHAZADO;
    } else if (despachados > 0 && despachados + rechazados === total) {
      req.estado = RequirementStatus.ATENDIDO;
    } else if (despachados > 0 && pendientes > 0) {
      req.estado = RequirementStatus.PARCIALMENTE_ATENDIDO;
    } else if (despachados === 0 && rechazados < total) {
      req.estado = RequirementStatus.APROBADO;
    }

    await manager.save(req);
  }
}
