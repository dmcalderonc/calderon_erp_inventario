import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, Repository, Brackets } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material } from './material.entity';
import { Categoria } from '../categorias/categoria.entity';
import { UnidadMedida } from '../unidades-medida/unidad-medida.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class MaterialesService {
  private readonly logger = new Logger(MaterialesService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) { }

  async create(createMaterialDto: CreateMaterialDto, usuarioId: string): Promise<Material> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoria = await queryRunner.manager.findOne(Categoria, {
        where: { id: createMaterialDto.categoria_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!categoria) {
        throw new NotFoundException(`La categoría con ID ${createMaterialDto.categoria_id} no existe.`);
      }

      const unidadMedida = await queryRunner.manager.findOne(UnidadMedida, {
        where: { id: createMaterialDto.unidad_medida_id },
      });

      if (!unidadMedida) {
        throw new NotFoundException(`La unidad de medida con ID ${createMaterialDto.unidad_medida_id} no existe.`);
      }

      const ultimoMaterial = await queryRunner.manager.findOne(Material, {
        where: { categoria: { id: categoria.id } },
        order: { id: 'DESC' },
      });

      let consecutivo = 1;
      if (ultimoMaterial && ultimoMaterial.sku) {
        const partesSku = ultimoMaterial.sku.split('-');
        if (partesSku.length === 2) {
          const ultimoNumero = parseInt(partesSku[1], 10);
          if (!isNaN(ultimoNumero)) {
            consecutivo = ultimoNumero + 1;
          }
        }
      }

      const numeroFormateado = String(consecutivo).padStart(4, '0');
      const nuevoSku = `${categoria.prefijo.toUpperCase()}-${numeroFormateado}`;

      const nuevoMaterial = queryRunner.manager.create(Material, {
        nombre: createMaterialDto.nombre,
        descripcion: createMaterialDto.descripcion,
        imagen: createMaterialDto.imagen,
        sku: nuevoSku,
        unidadMedida: unidadMedida,
        categoria: categoria,
      });

      const materialGuardado = await queryRunner.manager.save(nuevoMaterial);
      await queryRunner.commitTransaction();

      try {
        await this.auditoriaService.registrarAccion(
          usuarioId,
          'CREAR_MATERIAL',
          'Materiales',
          {
            mensaje: 'Material autogenerado con éxito',
            skuGenerado: materialGuardado.sku,
            nombreMaterial: materialGuardado.nombre,
            categoria: categoria.nombre
          }
        );
      } catch (auditError) {
        this.logger.error('Error al registrar en el módulo de auditoría (MongoDB):', auditError);
      }

      return materialGuardado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const query = this.materialRepository.createQueryBuilder('material')
      .leftJoinAndSelect('material.categoria', 'categoria')
      .leftJoinAndSelect('material.unidadMedida', 'unidadMedida');

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(material.nombre) LIKE LOWER(:search)', { search: `%${search}%` })
            .orWhere('LOWER(material.sku) LIKE LOWER(:search)', { search: `%${search}%` });
        }),
      );
    }

    query.orderBy('material.id', 'DESC');

    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const materialIds = data.map(m => m.id);

    let stockMap: Record<number, { disponible: number; reservada: number }> = {};
    if (materialIds.length > 0) {
      const stockRows = await this.dataSource
        .createQueryBuilder()
        .select('material_id', 'materialId')
        .addSelect('COALESCE(SUM(cantidad_disponible), 0)', 'disponible')
        .addSelect('COALESCE(SUM(cantidad_reservada), 0)', 'reservada')
        .from('stock_bodega', 'sb')
        .where('sb.material_id IN (:...ids)', { ids: materialIds })
        .groupBy('sb.material_id')
        .getRawMany();

      stockMap = Object.fromEntries(
        stockRows.map((r: any) => [r.materialId, { disponible: Number(r.disponible), reservada: Number(r.reservada) }])
      );
    }

    const enrichedData = data.map(m => ({
      ...m,
      stockDisponible: stockMap[m.id]?.disponible ?? 0,
      stockReservado: stockMap[m.id]?.reservada ?? 0,
    }));

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: {
        categoria: true,
        unidadMedida: true,
      },
    });

    if (!material) {
      throw new NotFoundException(`El material con ID ${id} no existe.`);
    }

    return material;
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto, usuarioId: string): Promise<Material> {
    const material = await this.findOne(id);
    
    if ('sku' in (updateMaterialDto as any)) {
      throw new BadRequestException('El SKU es generado automáticamente por el sistema y no puede ser alterado.');
    }

    const materialActualizado = this.materialRepository.merge(material, updateMaterialDto);
    const guardado = await this.materialRepository.save(materialActualizado);

    try {
      await this.auditoriaService.registrarAccion(
        usuarioId.toString(),
        'ACTUALIZAR_MATERIAL',
        'Materiales',
        { materialId: id, sku: guardado.sku, cambios: updateMaterialDto }
      );
    } catch (auditError) {
      this.logger.error('Error al auditar actualización:', auditError);
    }

    return guardado;
  }

  async remove(id: number, usuarioId: string): Promise<{ message: string }> {
    const material = await this.findOne(id);

    const stockCount = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('stock_bodega', 'sb')
      .where('sb.material_id = :id', { id })
      .getRawOne();

    if (stockCount && Number(stockCount.count) > 0) {
      throw new BadRequestException(
        `No se puede eliminar el material "${material.nombre}" porque tiene ${stockCount.count} registro(s) de inventario asociado(s). Retire el stock primero.`,
      );
    }

    const skuEliminado = material.sku;

    await this.materialRepository.remove(material);

    try {
      await this.auditoriaService.registrarAccion(
        usuarioId.toString(),
        'ELIMINAR_MATERIAL',
        'Materiales',
        { materialId: id, sku: skuEliminado, nombre: material.nombre }
      );
    } catch (auditError) {
      this.logger.error('Error al auditar eliminación:', auditError);
    }

    return { message: `El material con SKU ${skuEliminado} ha sido eliminado.` };
  }
}