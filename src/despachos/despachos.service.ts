import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Inventario } from '../inventario/inventario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Requirement,
  RequirementStatus,
} from '../requirements/entities/requirement.entity';
import { ItemStatus } from '../requirements/entities/requirement-detail.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
  EstadoMovimiento,
} from '../movimientos/entities/movimiento-inventario.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { CreateEntregaDirectaDto } from './dto/create-entrega-directa_mp.dto';

@Injectable()
export class DespachosService {
  private readonly logger = new Logger(DespachosService.name);

  constructor(
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Requirement)
    private reqRepository: Repository<Requirement>,
    @InjectRepository(Proyecto)
    private proyectoRepository: Repository<Proyecto>,
    @InjectModel('AuditLog') private auditModel: Model<any>,
    private readonly dataSource: DataSource,
  ) {}

  async registrarEntregaDirecta(dto: CreateEntregaDirectaDto, usuarioFirmaId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const proyecto = await this.proyectoRepository.findOne({
        where: { id: dto.proyectoId },
        relations: { bodega: true },
      });

      if (!proyecto) {
        throw new NotFoundException(`Proyecto con ID ${dto.proyectoId} no encontrado.`);
      }

      const bodegaId = proyecto.bodega?.id;
      if (!bodegaId) {
        throw new BadRequestException('El proyecto no tiene una bodega asignada.');
      }

      const movement = queryRunner.manager.create(MovimientoInventario, {
        tipo: TipoMovimiento.INGRESO,
        estado: EstadoMovimiento.PROCESADO,
        observaciones: dto.observaciones || `Entrega directa al proyecto ${proyecto.nombre}`,
        usuarioId: usuarioFirmaId,
        bodegaDestinoId: Number(bodegaId),
        detalles: dto.detalles.map((d: any) => ({
          materialId: Number(d.materialId),
          cantidad: Number(d.cantidad),
        })),
      });

      await queryRunner.manager.save(MovimientoInventario, movement);

      for (const detalle of dto.detalles) {
        const materialId = Number(detalle.materialId);
        const cantidad = Number(detalle.cantidad);

        const stockActual = await queryRunner.manager.findOne(Inventario, {
          where: { materialId, bodegaId: Number(bodegaId) },
        });

        if (stockActual) {
          stockActual.cantidad_disponible = (stockActual.cantidad_disponible || 0) + cantidad;
          await queryRunner.manager.save(Inventario, stockActual);
        } else {
          const nuevoStock = queryRunner.manager.create(Inventario, {
            materialId,
            bodegaId: Number(bodegaId),
            cantidad_disponible: cantidad,
            cantidad_reservada: 0,
          });
          await queryRunner.manager.save(Inventario, nuevoStock);
        }
      }

      if (dto.requerimientoId) {
        const req = await queryRunner.manager.findOne(Requirement, {
          where: { id: dto.requerimientoId },
          relations: { detalles: true },
        });

        if (req) {
          for (const det of (req.detalles || [])) {
            if (det.estadoItem !== ItemStatus.APROBADO_BODEGA) continue;
            det.estadoItem = ItemStatus.DESPACHADO;
            det.cantidadDespachada = Number(det.cantidadSolicitada);
            await queryRunner.manager.save(det);
          }
          req.estado = RequirementStatus.DESPACHADO;
          await queryRunner.manager.save(req);
        }
      }

      await queryRunner.commitTransaction();

      try {
        await this.auditModel.create({
          accion: 'ENTREGA_DIRECTA',
          entidad: 'Despacho',
          entidadId: movement.id,
          usuarioId: usuarioFirmaId,
          detalles: { proyectoId: dto.proyectoId, materiales: dto.detalles.length },
        });
      } catch (e) {
        this.logger.error('Error al registrar auditoría en MongoDB:', e);
      }

      return { message: 'Entrega directa registrada y stock actualizado.', movimientoId: movement.id };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
