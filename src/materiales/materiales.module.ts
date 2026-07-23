import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialesService } from './materiales.service';
import { MaterialesController } from './materiales.controller';
import { Material } from './material.entity';
import { Categoria } from '../categorias/categoria.entity';
import { UnidadMedida } from '../unidades-medida/unidad-medida.entity';
import { Inventario } from '../inventario/inventario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, Categoria, UnidadMedida, Inventario]),
    AuditoriaModule,
  ],
  controllers: [MaterialesController],
  providers: [MaterialesService],
})
export class MaterialesModule {}