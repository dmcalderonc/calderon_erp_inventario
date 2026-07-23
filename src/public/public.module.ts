import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { Material } from '../materiales/material.entity';
import { Categoria } from '../categorias/categoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Categoria])],
  controllers: [PublicController],
})
export class PublicModule {}
