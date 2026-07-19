import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudesCompraService } from './solicitudes-compra.service';
import { SolicitudesCompraController } from './solicitudes-compra.controller';
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import { DetalleSolicitud } from './entities/detalle-solicitud.entity';
import { Cotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudCompra, DetalleSolicitud, Cotizacion]),
    AuthModule,
  ],
  controllers: [SolicitudesCompraController],
  providers: [SolicitudesCompraService],
})
export class SolicitudesCompraModule {}
