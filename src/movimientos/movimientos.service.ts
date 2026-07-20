import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource } from 'typeorm';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import {
  MovimientoInventario,
  TipoMovimiento,
  EstadoMovimiento,
} from './entities/movimiento-inventario.entity';
import { DetalleMovimiento } from './entities/detalle-movimiento.entity';
import { Inventario } from '../inventario/inventario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  Requirement,
  RequirementStatus,
} from '../requirements/entities/requirement.entity';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(Requirement)
    private readonly reqRepository: Repository<Requirement>,
  ) {}

  async registrarMovimiento(dto: CreateMovimientoDto, usuarioId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      if (dto.tipo === TipoMovimiento.INGRESO && !dto.bodegaDestinoId) {
        throw new BadRequestException(
          'El INGRESO requiere una bodega de destino obligatoria.',
        );
      }
      if (dto.tipo === TipoMovimiento.EGRESO && !dto.bodegaOrigenId) {
        throw new BadRequestException(
          'El EGRESO requiere una bodega de origen obligatoria.',
        );
      }
      if (
        dto.tipo === TipoMovimiento.TRANSFERENCIA &&
        (!dto.bodegaOrigenId || !dto.bodegaDestinoId)
      ) {
        throw new BadRequestException(
          'La TRANSFERENCIA requiere bodega de origen y destino.',
        );
      }

      const movimiento = queryRunner.manager.create(MovimientoInventario, {
        tipo: dto.tipo,
        observaciones: dto.observaciones,
        bodegaOrigenId: dto.bodegaOrigenId,
        bodegaDestinoId: dto.bodegaDestinoId,
        usuarioId: usuarioId,
        estado: EstadoMovimiento.PROCESADO,
      } as any);

      const savedMovimiento = await queryRunner.manager.save(movimiento);
      const auditoriaSnapshot: any[] = [];
      const detalles = dto.detalles || [];

      for (const detalleDto of detalles) {
        const cantidad = detalleDto.cantidad as number;
        const materialId = detalleDto.materialId as number;

        const detalle = queryRunner.manager.create(DetalleMovimiento, {
          movimientoId: savedMovimiento.id,
          materialId: materialId,
          cantidad: cantidad,
        });
        await queryRunner.manager.save(detalle);

        let stockOrigen: Inventario | null = null;
        let stockDestino: Inventario | null = null;

        if (
          dto.tipo === TipoMovimiento.EGRESO ||
          dto.tipo === TipoMovimiento.TRANSFERENCIA
        ) {
          stockOrigen = await queryRunner.manager.findOne(Inventario, {
            where: {
              bodega: { id: dto.bodegaOrigenId },
              material: { id: materialId },
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (
            !stockOrigen ||
            Number(stockOrigen.cantidad_disponible) < cantidad
          ) {
            throw new BadRequestException(
              `Stock insuficiente (Material ID: ${materialId}) en la bodega de origen.`,
            );
          }
        }

        if (
          dto.tipo === TipoMovimiento.INGRESO ||
          dto.tipo === TipoMovimiento.TRANSFERENCIA
        ) {
          stockDestino = await queryRunner.manager.findOne(Inventario, {
            where: {
              bodega: { id: dto.bodegaDestinoId },
              material: { id: materialId },
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!stockDestino) {
            stockDestino = queryRunner.manager.create(Inventario, {
              bodega_id: dto.bodegaDestinoId,
              material_id: materialId,
              cantidad_disponible: 0,
              cantidad_reservada: 0,
            });
          }
        }

        const stockAntes = {
          origen: stockOrigen ? Number(stockOrigen.cantidad_disponible) : null,
          destino: stockDestino
            ? Number(stockDestino.cantidad_disponible)
            : null,
        };

        if (stockOrigen) {
          stockOrigen.cantidad_disponible =
            Number(stockOrigen.cantidad_disponible) - cantidad;
          await queryRunner.manager.save(Inventario, stockOrigen);
        }
        if (stockDestino) {
          stockDestino.cantidad_disponible =
            Number(stockDestino.cantidad_disponible) + cantidad;
          await queryRunner.manager.save(Inventario, stockDestino);
        }

        auditoriaSnapshot.push({
          materialId: materialId,
          cantidadMovida: cantidad,
          stockAntes,
          stockDespues: {
            origen: stockOrigen
              ? Number(stockOrigen.cantidad_disponible)
              : null,
            destino: stockDestino
              ? Number(stockDestino.cantidad_disponible)
              : null,
          },
        });
      }

      await queryRunner.commitTransaction();
      this.auditoriaService.registrarAccion(
        usuarioId,
        `MOVIMIENTO_INVENTARIO_${dto.tipo}`,
        'Movimientos',
        {
          movimientoId: savedMovimiento.id,
          tipo: dto.tipo,
          bodegas: { origen: dto.bodegaOrigenId, destino: dto.bodegaDestinoId },
          observaciones: dto.observaciones,
          trazabilidad_stock: auditoriaSnapshot,
        },
      );

      return savedMovimiento;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Fallo crítico en el motor transaccional: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.reqRepository.find({
      relations: { detalles: true, proyecto: true, usuarioSolicitante: true },
    });
  }

  async findOne(id: number) {
    const req = await this.reqRepository.findOne({
      where: { id },
      relations: {
        detalles: { material: true },
        proyecto: true,
        usuarioSolicitante: true,
      },
    });

    if (!req) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }
    return req;
  }

  async remove(id: number) {
    const req = await this.findOne(id);
    if (req.estado !== RequirementStatus.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden eliminar requerimientos pendientes',
      );
    }
    return await this.reqRepository.remove(req);
  }
}
