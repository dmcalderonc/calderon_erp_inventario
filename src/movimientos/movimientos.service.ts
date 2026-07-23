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

@Injectable()
export class MovimientosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
    @InjectRepository(MovimientoInventario)
    private readonly movRepository: Repository<MovimientoInventario>,
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
              bodegaId: dto.bodegaDestinoId,
              materialId: materialId,
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
    return await this.movRepository.find({
      order: { fecha: 'DESC' },
      relations: { bodegaOrigen: true, bodegaDestino: true },
    });
  }

  async findOne(id: string) {
    const mov = await this.movRepository.findOne({
      where: { id },
      relations: { detalles: { material: true } },
    });

    if (!mov) {
      throw new NotFoundException(`Movimiento ${id} no encontrado`);
    }
    return mov;
  }
}
