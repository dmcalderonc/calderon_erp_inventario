import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { AuditLogSchema } from './schemas/audit-log.schema';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { Cotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { Proveedor } from '../proveedores/proveedore.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrdenCompra, DetalleOrdenCompra, Cotizacion, Proveedor]),
    MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditLogSchema }]),
    MovimientosModule,
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule { }