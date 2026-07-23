// src/dashboard/dashboard.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto, EstadoProyecto } from '../proyectos/proyecto.entity';
import { Requirement, RequirementStatus } from '../requirements/entities/requirement.entity';
import { Inventario } from '../inventario/inventario.entity';
import { User } from '../users/user.entity';
import { Categoria } from '../categorias/categoria.entity';
import { Material } from '../materiales/material.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(Requirement)
    private readonly requirementRepo: Repository<Requirement>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async obtenerKpis() {
    try {
      const proyectosActivos = await this.proyectoRepo
        .createQueryBuilder('proyecto')
        .where('proyecto.estado = :estado', { estado: EstadoProyecto.ACTIVO })
        .getCount();

      const requerimientosPendientesRaw = await this.requirementRepo.query(`
        SELECT COUNT(*) as count FROM requerimientos WHERE estado = 'PENDIENTE'
      `);
      const requerimientosPendientes = parseInt(requerimientosPendientesRaw[0]?.count || '0', 10);

      const stockQuery = await this.inventarioRepo.query(`
        SELECT SUM(inv.cantidad_disponible) AS "totalUnidades"
        FROM stock_bodega inv
      `);
      const totalUnidades = parseInt(stockQuery[0]?.totalUnidades || '0', 10);

      const totalUsuarios = await this.userRepo.count();
      const totalCategorias = await this.categoriaRepo.count();
      const totalMateriales = await this.materialRepo.count();

      return {
        proyectosActivos,
        requerimientosPendientes,
        valorizacionTotalInventario: totalUnidades,
        totalUsuarios,
        totalCategorias,
        totalMateriales,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al calcular KPIs del dashboard: ' + error.message);
    }
  }

  async obtenerAlertasStock(umbral: number) {
    try {
      return await this.inventarioRepo
        .createQueryBuilder('inv')
        .innerJoinAndSelect('inv.material', 'material')
        .leftJoinAndSelect('inv.bodega', 'bodega')
        .where('inv.cantidad_disponible < :umbral', { umbral })
        .getMany();
    } catch (error) {
      throw new InternalServerErrorException('Error al consultar alertas de stock: ' + error.message);
    }
  }

  async obtenerLineaTiempo() {
    try {
      return await this.auditoriaService.obtenerLogsRecientes();
    } catch (error) {
      throw new InternalServerErrorException('Error al cargar la línea de tiempo: ' + error.message);
    }
  }
}
