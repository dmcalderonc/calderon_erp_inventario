import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material } from './material.entity';
import { Categoria } from '../categorias/categoria.entity';
import { UnidadMedida } from '../unidades-medida/unidad-medida.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(UnidadMedida)
    private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) { }

  async create(createMaterialDto: CreateMaterialDto, usuarioId: number): Promise<Material> {
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
        sku: nuevoSku,
        unidadMedida: unidadMedida,
        categoria: categoria,
      });

      const materialGuardado = await queryRunner.manager.save(nuevoMaterial);
      await queryRunner.commitTransaction();

      try {
        await this.auditoriaService.registrarAccion(
          usuarioId.toString(),
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
        console.error('Error al registrar en el módulo de auditoría (MongoDB):', auditError);
      }

      return materialGuardado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Material[]> {
    return await this.materialRepository.find({
      relations: {
        categoria: true,
        unidadMedida: true,
      },
    });
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

  async update(id: number, updateMaterialDto: UpdateMaterialDto, usuarioId: number): Promise<Material> {
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
      console.error('Error al auditar actualización:', auditError);
    }

    return guardado;
  }

  async remove(id: number, usuarioId: number): Promise<{ message: string }> {
    const material = await this.findOne(id);
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
      console.error('Error al auditar eliminación:', auditError);
    }

    return { message: `El material con SKU ${skuEliminado} ha sido eliminado.` };
  }
}