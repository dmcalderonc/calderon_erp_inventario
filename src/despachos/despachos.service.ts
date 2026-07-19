import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Requirement,
  RequirementStatus,
} from '../requirements/entities/requirement.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
} from '../movimientos/entities/movimiento-inventario.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { CreateEntregaDirectaDto } from './dto/create-entrega-directa_mp.dto';

@Injectable()
export class DespachosService {
  constructor(
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Requirement)
    private reqRepository: Repository<Requirement>,
    @InjectRepository(Proyecto)
    private proyectoRepository: Repository<Proyecto>,
    @InjectModel('AuditLog') private auditModel: Model<any>,
    private readonly dataSource: DataSource,
  ) {}

  async registrarEntregaDirecta(
    dto: CreateEntregaDirectaDto,
    usuarioFirmaId: string,
  ) {
    // Iniciamos la transacción controlada por QueryRunner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let movimientoGeneradoId: string | null = null;

    try {
      // 1. Validar existencia del Proyecto y su Bodega Virtual
      const proyecto = await queryRunner.manager.findOne(Proyecto, {
        where: { id: dto.proyectoId },
        relations: { bodega: true },
      });

      if (!proyecto || !proyecto.bodega) {
        throw new NotFoundException(
          'El Proyecto o su Bodega Virtual no existen.',
        );
      }

      // CRITERIO: Movimiento A (INGRESO a Bodega Virtual)
      // Nota: Aquí creamos el movimiento usando el Manager de la transacción actual
      // para garantizar que si falla el paso B, este paso también se revierta.
      const nuevoMovimiento = queryRunner.manager.create(MovimientoInventario, {
        tipo: TipoMovimiento.INGRESO,
        bodegaDestinoId: proyecto.bodega.id,
        observaciones: `OC-${dto.ordenCompraId}-ENTREGA-DIRECTA`,
        usuarioId: usuarioFirmaId,
        detalles: dto.detalles.map((d) => ({
          materialId: d.materialId,
          cantidad: d.cantidad,
        })),
      } as any);
      const movimientoGuardado =
        await queryRunner.manager.save(nuevoMovimiento);
      movimientoGeneradoId = movimientoGuardado.id ?? null;

      // CRITERIO: Movimiento B (Cambio de Estado del Requerimiento)
      const requerimiento = await queryRunner.manager.findOne(Requirement, {
        where: { id: dto.requerimientoId },
      });

      if (!requerimiento) {
        throw new NotFoundException('Requerimiento no encontrado.');
      }

      if (requerimiento.estado !== RequirementStatus.APROBADO) {
        throw new BadRequestException(
          'El requerimiento debe estar en estado APROBADO para realizar la entrega directa.',
        );
      }

      requerimiento.estado = RequirementStatus.DESPACHADO;
      await queryRunner.manager.save(requerimiento);

      // Confirmamos que ambas operaciones SQL fueron exitosas
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Fallo en transacción de entrega directa: ${error.message}`,
          );
    } finally {
      await queryRunner.release();
    }

    // CRITERIO: Auditoría Forense (MongoDB)
    // Se ejecuta fuera del bloque SQL porque Mongo no es parte de la transacción relacional
    try {
      await this.auditModel.create({
        accion: 'ENTREGA_DIRECTA_OBRA',
        entidad: 'Despacho',
        registroId: movimientoGeneradoId,
        usuarioFirmaId: usuarioFirmaId,
        detalles: `Recepción directa en proyecto ${dto.proyectoId} para Req #${dto.requerimientoId}`,
        fecha: new Date(),
      });
    } catch (mongoError) {
      console.error(
        'Alerta: Fallo en el guardado de auditoría forense:',
        mongoError,
      );
      // Opcional: Podrías notificar a un logger de errores externo sin romper la respuesta del usuario
    }

    return {
      statusCode: 201,
      message: 'Entrega directa procesada exitosamente con doble afectación.',
      movimientoId: movimientoGeneradoId,
    };
  }
}
