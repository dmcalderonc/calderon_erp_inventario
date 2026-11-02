import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrevisionController } from './prevision.controller';
import { PrevisionService } from './prevision.service';
import { MovimientoInventario } from '../movimientos/entities/movimiento-inventario.entity';
import { Inventario } from '../inventario/inventario.entity';
import { Material } from '../materiales/material.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoInventario, Inventario, Material]),
    AuditoriaModule,
    NotificationsModule,
  ],
  controllers: [PrevisionController],
  providers: [PrevisionService],
})
export class PrevisionModule {}
