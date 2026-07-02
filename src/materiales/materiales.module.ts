import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesService } from './materiales.service';
import { MaterialesController } from './materiales.controller';
import { Material } from './material.entity';
import { Categoria } from '../categorias/categoria.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, Categoria]),
    AuditoriaModule,
  ],
  controllers: [MaterialesController],
  providers: [MaterialesService],
})
export class MaterialesModule {}