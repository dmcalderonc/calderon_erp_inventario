import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { ProyectosService } from './proyectos.service';
import { ProyectosController } from './proyectos.controller';
import { Proyecto } from './proyecto.entity'; 
import { BodegasModule } from '../bodegas/bodegas.module'; 
import { ProyectoUsuario } from 'src/users/proyecto-usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto]), 
    BodegasModule, ProyectoUsuario,
                     
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}