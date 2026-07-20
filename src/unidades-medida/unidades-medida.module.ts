import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadMedida } from './unidad-medida.entity';
import { UnidadesMedidaService } from './unidades-medida.service';
import { UnidadesMedidaController } from './unidades-medida.controller';
import { Material } from '../materiales/material.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnidadMedida, Material]),
  ],
  controllers: [UnidadesMedidaController],
  providers: [UnidadesMedidaService],
})
export class UnidadesMedidaModule {}
