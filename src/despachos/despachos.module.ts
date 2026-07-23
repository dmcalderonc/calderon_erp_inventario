import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DespachosService } from './despachos.service';
import { DespachosController } from './despachos.controller';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { Requirement } from '../requirements/entities/requirement.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { AuditoriaLogSchema } from '../auditoria/auditoria.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, Proyecto]),
    MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditoriaLogSchema }]),
    MovimientosModule,
  ],
  controllers: [DespachosController],
  providers: [DespachosService],
})
export class DespachosModule { }
