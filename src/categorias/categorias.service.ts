import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    try {
      const nuevaCategoria = this.categoriaRepository.create(createCategoriaDto);
      return await this.categoriaRepository.save(nuevaCategoria);
    } catch (error) {
      if (error.code === '23505') { 
        throw new BadRequestException('El nombre o el prefijo ya se encuentra registrado.');
      }
      throw error;
    }
  }

  async findAll(): Promise<Categoria[]> {
    return await this.categoriaRepository.find();
  }

  async findOne(id: number): Promise<Categoria> {
    const categoria = await this.categoriaRepository.findOneBy({ id });
    
    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe.`);
    }
    
    return categoria;
  }

  async update(id: number, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOne(id);

    try {
      const categoriaActualizada = this.categoriaRepository.merge(categoria, updateCategoriaDto);
      return await this.categoriaRepository.save(categoriaActualizada);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El nombre o el prefijo ya está en uso por otra categoría.');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const categoria = await this.findOne(id);
    await this.categoriaRepository.remove(categoria);
    
    return { message: `La categoría "${categoria.nombre}" fue eliminada correctamente.` };
  }
}