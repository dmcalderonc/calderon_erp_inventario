import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Inventario } from './inventario.entity';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';
import { Material } from '../materiales/material.entity';
import { Bodega } from '../bodegas/bodegas.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { assertBodegaVisible } from '../common/utils/bodega-scope';

@Injectable()
export class InventarioService {
  private readonly logger = new Logger(InventarioService.name);

  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(dto: CreateInventarioDto, usuarioId?: string, bodegasVisibles: number[] | null = null) {
    assertBodegaVisible(bodegasVisibles, dto.bodega_id, 'No tiene permisos para operar sobre esta bodega');

    const material = await this.materialRepository.findOne({
      where: { id: dto.material_id },
    });
    if (!material) {
      throw new NotFoundException(`El material con ID ${dto.material_id} no existe.`);
    }

    const bodega = await this.bodegaRepository.findOne({
      where: { id: dto.bodega_id },
    });
    if (!bodega) {
      throw new NotFoundException(`La bodega con ID ${dto.bodega_id} no existe.`);
    }

    const existing = await this.inventarioRepository.findOne({
      where: { materialId: dto.material_id, bodegaId: dto.bodega_id },
    });

    if (existing) {
      existing.cantidad_disponible = (existing.cantidad_disponible || 0) + (dto.cantidad_disponible || 0);
      existing.cantidad_reservada = (existing.cantidad_reservada || 0) + (dto.cantidad_reservada || 0);
      const updated = await this.inventarioRepository.save(existing);

      if (usuarioId) {
        try {
          await this.auditoriaService.registrarAccion(
            usuarioId,
            'ACTUALIZAR_INVENTARIO',
            'Inventario',
            {
              inventarioId: updated.id,
              materialId: dto.material_id,
              bodegaId: dto.bodega_id,
              cantidad_disponible: updated.cantidad_disponible,
              cantidad_reservada: updated.cantidad_reservada,
            },
          );
        } catch (auditError) {
          this.logger.error('Error al auditar actualización de inventario:', auditError);
        }
      }

      return updated;
    }

    const registro = this.inventarioRepository.create({
      materialId: dto.material_id,
      bodegaId: dto.bodega_id,
      cantidad_disponible: dto.cantidad_disponible || 0,
      cantidad_reservada: dto.cantidad_reservada || 0,
    });
    const saved = await this.inventarioRepository.save(registro);

    if (usuarioId) {
      try {
        await this.auditoriaService.registrarAccion(
          usuarioId,
          'CREAR_INVENTARIO',
          'Inventario',
          {
            inventarioId: saved.id,
            materialId: dto.material_id,
            bodegaId: dto.bodega_id,
            cantidad_disponible: saved.cantidad_disponible,
            cantidad_reservada: saved.cantidad_reservada,
          },
        );
      } catch (auditError) {
        this.logger.error('Error al auditar creación de inventario:', auditError);
      }
    }

    return saved;
  }

  async findAll(bodegasVisibles: number[] | null = null) {
    return this.inventarioRepository.find({
      where: bodegasVisibles === null ? {} : { bodegaId: In(bodegasVisibles) },
      relations: { material: true, bodega: true },
    });
  }

  async findOne(id: number, bodegasVisibles: number[] | null = null) {
    const registro = await this.inventarioRepository.findOne({
      where: { id },
      relations: { material: true, bodega: true },
    });
    if (!registro) {
      throw new NotFoundException(`Registro de inventario #${id} no encontrado.`);
    }
    assertBodegaVisible(bodegasVisibles, registro.bodegaId);
    return registro;
  }

  async update(id: number, dto: UpdateInventarioDto, bodegasVisibles: number[] | null = null) {
    await this.findOne(id, bodegasVisibles);
    await this.inventarioRepository.update(id, dto);
    return this.findOne(id, bodegasVisibles);
  }

  async remove(id: number, bodegasVisibles: number[] | null = null) {
    await this.findOne(id, bodegasVisibles);
    await this.inventarioRepository.delete(id);
  }

  async getStockByBodega(bodegaId: number, bodegasVisibles: number[] | null = null) {
    assertBodegaVisible(bodegasVisibles, bodegaId, 'No tiene permisos para consultar esta bodega');
    return this.inventarioRepository.find({
      where: { bodegaId: bodegaId },
      relations: { material: true },
    });
  }

  async getGlobalStockByMaterial(materialId: number) {
    const registros = await this.inventarioRepository.find({
      where: { materialId },
    });
    const totalDisponible = registros.reduce((sum, r) => sum + (r.cantidad_disponible || 0), 0);
    const totalReservada = registros.reduce((sum, r) => sum + (r.cantidad_reservada || 0), 0);
    return { materialId, totalDisponible, totalReservada, total: totalDisponible + totalReservada };
  }

  async findByMaterialAndBodega(materialId: number, bodegaId: number) {
    return this.inventarioRepository.findOne({
      where: { materialId, bodegaId },
    });
  }

  async getStockByBodegas(materialId: number, bodegasVisibles: number[] | null = null) {
    const registros = await this.inventarioRepository.find({
      where: bodegasVisibles === null
        ? { materialId }
        : { materialId, bodegaId: In(bodegasVisibles) },
      relations: { bodega: true },
    });
    return registros.map(r => ({
      bodegaId: r.bodegaId,
      bodegaNombre: r.bodega?.nombre || 'N/A',
      ubicacion: r.bodega?.ubicacion || 'N/A',
      cantidad_disponible: r.cantidad_disponible || 0,
      cantidad_reservada: r.cantidad_reservada || 0,
      efectivo: (r.cantidad_disponible || 0) - (r.cantidad_reservada || 0),
    }));
  }
}
