import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Bodega } from './bodegas.entity';
import { CreateBodegaDto } from './dto/create-bodegas.dto';
import { UpdateBodegasDto } from './dto/update-bodegas.dto';

@Injectable()
export class BodegasService {
  constructor(
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
  ) { }

  async create(createBodegaDto: any, manager?: any) {
    const repo = manager ? manager.getRepository(Bodega) : this.bodegaRepository;
    const bodega = repo.create(createBodegaDto);
    return await repo.save(bodega);
  }

  async findAll(): Promise<Bodega[]> {
    return await this.bodegaRepository.find();
  }

  async findOne(id: number): Promise<Bodega> {
    const bodega = await this.bodegaRepository.findOneBy({ id });
    if (!bodega) {
      throw new NotFoundException(`Bodega con ID ${id} no encontrada`);
    }
    return bodega;
  }
  async update(id: number, updateDto: UpdateBodegasDto) {
    const bodega = await this.bodegaRepository.preload({
      id,          
      ...updateDto, 
    });

    if (!bodega) {
      throw new NotFoundException(`Bodega con ID ${id} no encontrada`);
    }

    return await this.bodegaRepository.save(bodega);
  }

  async remove(id: number) {
    const bodega = await this.findOne(id);
    return await this.bodegaRepository.remove(bodega);
  }



}