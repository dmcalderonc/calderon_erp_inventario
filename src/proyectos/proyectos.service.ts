import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { BodegasService } from '../bodegas/bodegas.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectoRepository: Repository<Proyecto>,
    private readonly dataSource: DataSource,
    private readonly bodegasService: BodegasService,
  ) { }

  async create(createProyectoDto: CreateProyectoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!createProyectoDto.codigoProyecto) {
        const anioActual = new Date().getFullYear();
        const totalProyectos = await queryRunner.manager.count(Proyecto);
        const correlativo = (totalProyectos + 1).toString().padStart(3, '0');
        createProyectoDto.codigoProyecto = `PROY-${anioActual}-${correlativo}`;
      }

      const nuevoProyecto = queryRunner.manager.create(Proyecto, createProyectoDto);
      const proyectoGuardado = await queryRunner.manager.save(Proyecto, nuevoProyecto);

      await this.bodegasService.create({
        nombre: `Bodega Obra: ${proyectoGuardado.nombre}`,
        ubicacion: 'En Obra',
        isPrincipal: false,
        proyectoId: proyectoGuardado.id,
      }, queryRunner.manager);

      await queryRunner.commitTransaction();
      return proyectoGuardado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error transaccional al crear proyecto y bodega: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Proyecto[]> {
    return await this.proyectoRepository.find({ relations: { bodega: true } });
  }

  async findOne(id: string): Promise<Proyecto> {
    const proyecto = await this.proyectoRepository.findOne({
      where: { id },
      relations: { bodega: true }
    });
    
    if (!proyecto) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }
    return proyecto;
  }

  async update(id: string, updateProyectoDto: UpdateProyectoDto): Promise<Proyecto> {
    await this.proyectoRepository.update(id, updateProyectoDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.proyectoRepository.delete(id);
    return { deleted: true };
  }
}