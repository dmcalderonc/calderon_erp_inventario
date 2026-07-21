import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { Material } from '../materiales/material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material])],
  controllers: [PublicController],
})
export class PublicModule {}
