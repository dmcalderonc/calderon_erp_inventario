import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraspasosService } from './traspasos.service';
import { TraspasosController } from './traspasos.controller';
import { Traspaso } from './entities/traspaso.entity';
import { DetalleTraspaso } from './entities/detalle-traspaso.entity';
import { Inventario } from '../inventario/inventario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Traspaso, DetalleTraspaso, Inventario]),
  ],
  controllers: [TraspasosController],
  providers: [TraspasosService],
  exports: [TraspasosService],
})
export class TraspasosModule {}
