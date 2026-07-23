import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Traspaso, EstadoTraspaso } from './entities/traspaso.entity';
import { DetalleTraspaso } from './entities/detalle-traspaso.entity';
import { Inventario } from '../inventario/inventario.entity';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';

@Injectable()
export class TraspasosService {
  constructor(
    @InjectRepository(Traspaso)
    private readonly traspasoRepo: Repository<Traspaso>,
    @InjectRepository(DetalleTraspaso)
    private readonly detalleRepo: Repository<DetalleTraspaso>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    private dataSource: DataSource,
  ) {}

  private generarCodigo(): string {
    const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    return `TRASP-${suffix}`;
  }

  async create(dto: CreateTraspasoDto, usuarioId: string) {
    if (dto.bodegaOrigenId === dto.bodegaDestinoId) {
      throw new BadRequestException('La bodega origen y destino deben ser diferentes');
    }

    const codigo = this.generarCodigo();
    const traspaso = this.traspasoRepo.create({
      codigo,
      bodegaOrigenId: dto.bodegaOrigenId,
      bodegaDestinoId: dto.bodegaDestinoId,
      usuarioOrigenId: usuarioId,
      estado: EstadoTraspaso.PENDIENTE,
      observaciones: dto.observaciones,
      detalles: dto.detalles.map(d => ({
        materialId: d.materialId,
        cantidad: d.cantidad,
        cantidadRecibida: 0,
      })),
    });

    return this.traspasoRepo.save(traspaso);
  }

  async findAll(params?: { estado?: string; bodegaOrigenId?: number; bodegaDestinoId?: number }) {
    const where: FindOptionsWhere<Traspaso> = {};
    if (params?.estado) where.estado = params.estado as EstadoTraspaso;
    if (params?.bodegaOrigenId) where.bodegaOrigenId = params.bodegaOrigenId;
    if (params?.bodegaDestinoId) where.bodegaDestinoId = params.bodegaDestinoId;

    return this.traspasoRepo.find({
      where,
      relations: {
        bodegaOrigen: true,
        bodegaDestino: true,
        usuarioOrigen: true,
        usuarioDestino: true,
        detalles: { material: true },
      },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findOne(id: number) {
    const traspaso = await this.traspasoRepo.findOne({
      where: { id },
      relations: {
        bodegaOrigen: true,
        bodegaDestino: true,
        usuarioOrigen: true,
        usuarioDestino: true,
        detalles: { material: true },
      },
    });
    if (!traspaso) throw new NotFoundException(`Traspaso #${id} no encontrado`);
    return traspaso;
  }

  async confirmarEnvio(id: number, usuarioId: string, rol: string, bodegaAsignadaId?: number | null) {
    const traspaso = await this.findOne(id);
    if (traspaso.estado !== EstadoTraspaso.PENDIENTE) {
      throw new BadRequestException(`El traspaso debe estar en estado PENDIENTE para enviar. Estado actual: ${traspaso.estado}`);
    }

    if (rol === 'BODEGUERO' && bodegaAsignadaId !== traspaso.bodegaOrigenId) {
      throw new ForbiddenException('No tiene permisos para gestionar esta bodega');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const detalle of traspaso.detalles) {
        const inv = await queryRunner.manager.findOne(Inventario, {
          where: { materialId: detalle.materialId, bodegaId: traspaso.bodegaOrigenId },
        });

        const disponible = inv ? (inv.cantidad_disponible || 0) - (inv.cantidad_reservada || 0) : 0;
        if (disponible < detalle.cantidad) {
          throw new BadRequestException(`Stock insuficiente en bodega origen para material ${detalle.materialId}. Disponible: ${disponible}, requerido: ${detalle.cantidad}`);
        }

        if (inv) {
          inv.cantidad_disponible = (inv.cantidad_disponible || 0) - detalle.cantidad;
          await queryRunner.manager.save(inv);
        }
      }

      traspaso.estado = EstadoTraspaso.EN_TRANSITO;
      traspaso.fechaEnvio = new Date();
      await queryRunner.manager.save(traspaso);

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmarRecepcion(id: number, usuarioId: string, rol: string, bodegaAsignadaId?: number | null) {
    const traspaso = await this.findOne(id);
    if (traspaso.estado !== EstadoTraspaso.EN_TRANSITO) {
      throw new BadRequestException(`El traspaso debe estar EN_TRÁNSITO para recibir. Estado actual: ${traspaso.estado}`);
    }

    if (rol === 'BODEGUERO' && bodegaAsignadaId !== traspaso.bodegaDestinoId) {
      throw new ForbiddenException('No tiene permisos para recibir en esta bodega');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const detalle of traspaso.detalles) {
        let inv = await queryRunner.manager.findOne(Inventario, {
          where: { materialId: detalle.materialId, bodegaId: traspaso.bodegaDestinoId },
        });

        if (inv) {
          inv.cantidad_disponible = (inv.cantidad_disponible || 0) + detalle.cantidad;
          await queryRunner.manager.save(inv);
        } else {
          inv = queryRunner.manager.create(Inventario, {
            materialId: detalle.materialId,
            bodegaId: traspaso.bodegaDestinoId,
            cantidad_disponible: detalle.cantidad,
            cantidad_reservada: 0,
          });
          await queryRunner.manager.save(inv);
        }

        detalle.cantidadRecibida = detalle.cantidad;
        await queryRunner.manager.save(detalle);
      }

      if (traspaso.requerimientoDetalleId) {
        await queryRunner.manager.query(
          `UPDATE detalles_requerimiento SET "estadoItem" = 'APROBADO_BODEGA' WHERE id = $1`,
          [traspaso.requerimientoDetalleId],
        );
      }

      traspaso.estado = EstadoTraspaso.RECIBIDO;
      traspaso.fechaRecepcion = new Date();
      traspaso.usuarioDestinoId = usuarioId;
      await queryRunner.manager.save(traspaso);

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelar(id: number) {
    const traspaso = await this.findOne(id);
    if (traspaso.estado === EstadoTraspaso.RECIBIDO) {
      throw new BadRequestException('No se puede cancelar un traspaso ya recibido');
    }

    if (traspaso.estado === EstadoTraspaso.EN_TRANSITO) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (const detalle of traspaso.detalles) {
          const inv = await queryRunner.manager.findOne(Inventario, {
            where: { materialId: detalle.materialId, bodegaId: traspaso.bodegaOrigenId },
          });
          if (inv) {
            inv.cantidad_disponible = (inv.cantidad_disponible || 0) + detalle.cantidad;
            await queryRunner.manager.save(inv);
          }
        }

        traspaso.estado = EstadoTraspaso.CANCELADO;
        await queryRunner.manager.save(traspaso);

        await queryRunner.commitTransaction();
      } catch (error) {
        if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      traspaso.estado = EstadoTraspaso.CANCELADO;
      await this.traspasoRepo.save(traspaso);
    }

    return this.findOne(id);
  }
}
