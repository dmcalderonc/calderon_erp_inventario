import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { UnidadMedida } from './unidad-medida.entity';
import { Material } from '../materiales/material.entity';

@Injectable()
export class UnidadesMedidaService implements OnModuleInit {
  private readonly logger = new Logger(UnidadesMedidaService.name);

  constructor(
    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async onModuleInit() {
    const seedData = [
      { nombre: 'Unidad', simbolo: 'U' },
      { nombre: 'Kilogramo', simbolo: 'KG' },
      { nombre: 'Metro', simbolo: 'M' },
      { nombre: 'Metro cuadrado', simbolo: 'M2' },
    ];

    for (const item of seedData) {
      const existe = await this.unidadMedidaRepository.findOneBy({ simbolo: item.simbolo });
      if (!existe) {
        await this.unidadMedidaRepository.save(this.unidadMedidaRepository.create(item));
        this.logger.log(`Unidad de medida semilla creada: ${item.nombre} (${item.simbolo})`);
      }
    }
  }

  async create(dto: CreateUnidadMedidaDto): Promise<UnidadMedida> {
    try {
      const nuevaUnidad = this.unidadMedidaRepository.create(dto);
      return await this.unidadMedidaRepository.save(nuevaUnidad);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El nombre o el símbolo ya se encuentra registrado.');
      }
      throw error;
    }
  }

  async findAll(): Promise<UnidadMedida[]> {
    return await this.unidadMedidaRepository.find();
  }

  async findOne(id: number): Promise<UnidadMedida> {
    const unidad = await this.unidadMedidaRepository.findOneBy({ id });

    if (!unidad) {
      throw new NotFoundException(`La unidad de medida con ID ${id} no existe.`);
    }

    return unidad;
  }

  async update(id: number, dto: UpdateUnidadMedidaDto): Promise<UnidadMedida> {
    const unidad = await this.findOne(id);

    try {
      const unidadActualizada = this.unidadMedidaRepository.merge(unidad, dto);
      return await this.unidadMedidaRepository.save(unidadActualizada);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El nombre o el símbolo ya está en uso por otra unidad.');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const unidad = await this.findOne(id);

    const materialesAsociados = await this.materialRepository.find({
      where: { unidadMedida: { id } },
    });

    if (materialesAsociados.length > 0) {
      const nombres = materialesAsociados.map(m => `"${m.nombre}" (${m.sku})`).join(', ');
      throw new BadRequestException(
        `No se puede eliminar la unidad "${unidad.nombre}" porque está asociada a ${materialesAsociados.length} material(es): ${nombres}.`,
      );
    }

    await this.unidadMedidaRepository.remove(unidad);

    return { message: `La unidad de medida "${unidad.nombre}" fue eliminada correctamente.` };
  }
}
