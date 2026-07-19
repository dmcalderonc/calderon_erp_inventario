import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DespachosService } from './despachos.service';
import { DespachosController } from './despachos.controller';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { Requirement } from '../requirements/entities/requirement.entity';
import { Proyecto } from '../proyectos/proyecto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requirement, Proyecto]),
    // Asegúrate de que el Schema de AuditLog coincida con cómo lo registraste en AppModule
    MongooseModule.forFeature([{ name: 'AuditLog', schema: {} as any }]),
    MovimientosModule // Inyectamos el módulo del Ticket 7
  ],
  controllers: [DespachosController],
  providers: [DespachosService],
})
export class DespachosModule { }