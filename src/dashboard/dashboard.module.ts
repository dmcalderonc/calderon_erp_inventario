// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Requirement } from '../requirements/entities/requirement.entity';
import { Inventario } from '../inventario/inventario.entity';
import { User } from '../users/user.entity';
import { Categoria } from '../categorias/categoria.entity';
import { Material } from '../materiales/material.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, Requirement, Inventario, User, Categoria, Material]),
    AuditoriaModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
