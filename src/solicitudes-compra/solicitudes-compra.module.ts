import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudesCompraService } from './solicitudes-compra.service';
import { SolicitudesCompraController } from './solicitudes-compra.controller';
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import { DetalleSolicitud } from './entities/detalle-solicitud.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudCompra, DetalleSolicitud]),
    AuthModule,
  ],
  controllers: [SolicitudesCompraController],
  providers: [SolicitudesCompraService],
})
export class SolicitudesCompraModule {}
