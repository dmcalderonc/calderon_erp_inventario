import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesController } from './cotizaciones.controller';
import { Cotizacion } from './entities/cotizacion.entity';
import { RequirementDetail } from '../requirements/entities/requirement-detail.entity';
import { Requirement } from '../requirements/entities/requirement.entity';
import { OrdenCompra } from '../compras/entities/orden-compra.entity';
import { DetalleOrdenCompra } from '../compras/entities/detalle-orden-compra.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cotizacion, RequirementDetail, Requirement, OrdenCompra, DetalleOrdenCompra]),
    AuthModule,
  ],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
