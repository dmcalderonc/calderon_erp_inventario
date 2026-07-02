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


  create(createInventarioDto: CreateInventarioDto) {
    console.log("¡Llegó al servicio de inventario!");
  }

  findAll() {
    return this.inventarioRepository.find();
  }

  findOne(id: number) {
    return this.inventarioRepository.findOne({ where: { id } });
  }

  update(id: number, updateInventarioDto: UpdateInventarioDto) {
    return this.inventarioRepository.update(id, updateInventarioDto);
  }

  remove(id: number) {
    return this.inventarioRepository.delete(id);
  }

  async getStockByBodega(bodegaId: number): Promise<Inventario[]> {
    return await this.inventarioRepository.find({ where: { bodega_id: bodegaId } });
  }

  async getGlobalStockByMaterial(materialId: number): Promise<number> {
    const stocks = await this.inventarioRepository.find({ where: { material: { id: materialId } } });
    return stocks.reduce((acc, curr) => acc + (curr.cantidad_disponible || 0) + (curr.cantidad_reservada || 0), 0);
  }
}