import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { Requirement } from './entities/requirement.entity';
import { RequirementDetail } from './entities/requirement-detail.entity';
import { Inventario } from '../inventario/inventario.entity';
import { MovimientoInventario } from '../movimientos/entities/movimiento-inventario.entity';
import { DetalleMovimiento } from '../movimientos/entities/detalle-movimiento.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Requirement,
      RequirementDetail,
      Inventario,
      MovimientoInventario,
      DetalleMovimiento,
    ]),
    AuthModule,
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService],
})
export class RequirementsModule {}
