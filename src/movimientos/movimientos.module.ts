import { Module } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { MovimientosController } from './movimientos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { DetalleMovimiento } from './entities/detalle-movimiento.entity';
import { Requirement } from '../requirements/entities/requirement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario, DetalleMovimiento, Requirement]),
    AuditoriaModule 
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService]
})
export class MovimientosModule {}