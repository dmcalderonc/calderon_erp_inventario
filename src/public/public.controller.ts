import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../materiales/material.entity';
import { Categoria } from '../categorias/categoria.entity';

@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  @Get('categorias')
  async findAllCategorias() {
    return this.categoriaRepository.find({ order: { nombre: 'ASC' } });
  }

  @Get('materiales')
  async findAll(
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const take = Math.min(parseInt(limit || '10', 10), 50);
    const skip = (Math.max(parseInt(page || '1', 10), 1) - 1) * take;

    const qb = this.materialRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.categoria', 'categoria')
      .leftJoinAndSelect('m.unidadMedida', 'unidadMedida');

    if (search) {
      qb.where(
        '(LOWER(m.nombre) LIKE :search OR LOWER(m.sku) LIKE :search OR LOWER(m.descripcion) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (categoria) {
      qb.andWhere('categoria.id = :categoriaId', { categoriaId: parseInt(categoria, 10) });
    }

    const sortField = sort === 'sku' ? 'm.sku' : sort === 'categoria' ? 'categoria.nombre' : 'm.nombre';
    const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortField, sortOrder);

    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: parseInt(page || '1', 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get('materiales/:id')
  async findOne(@Param('id') id: string) {
    const material = await this.materialRepository.findOne({
      where: { id: +id },
      relations: { categoria: true, unidadMedida: true },
    });
    if (!material) {
      return { statusCode: 404, message: 'Material no encontrado' };
    }
    return material;
  }
}
