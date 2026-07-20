import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './inventario.entity';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
  ) {}

  async create(dto: CreateInventarioDto) {
    const existing = await this.inventarioRepository.findOne({
      where: { materialId: dto.material_id, bodega_id: dto.bodega_id },
    });

    if (existing) {
      existing.cantidad_disponible = (existing.cantidad_disponible || 0) + (dto.cantidad_disponible || 0);
      existing.cantidad_reservada = (existing.cantidad_reservada || 0) + (dto.cantidad_reservada || 0);
      return this.inventarioRepository.save(existing);
    }

    const registro = this.inventarioRepository.create({
      materialId: dto.material_id,
      bodega_id: dto.bodega_id,
      cantidad_disponible: dto.cantidad_disponible || 0,
      cantidad_reservada: dto.cantidad_reservada || 0,
    });
    return this.inventarioRepository.save(registro);
  }

  async findAll() {
    return this.inventarioRepository.find({
      relations: { material: true, bodega: true },
    });
  }

  async findOne(id: number) {
    const registro = await this.inventarioRepository.findOne({
      where: { id },
      relations: { material: true, bodega: true },
    });
    if (!registro) {
      throw new NotFoundException(`Registro de inventario #${id} no encontrado.`);
    }
    return registro;
  }

  async update(id: number, dto: UpdateInventarioDto) {
    await this.findOne(id);
    await this.inventarioRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.inventarioRepository.delete(id);
  }

  async getStockByBodega(bodegaId: number) {
    return this.inventarioRepository.find({
      where: { bodega_id: bodegaId },
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
}
