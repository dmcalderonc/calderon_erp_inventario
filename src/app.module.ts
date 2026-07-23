import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuthModule } from './auth/auth.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { InventarioModule } from './inventario/inventario.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MaterialesModule } from './materiales/materiales.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { BodegasModule } from './bodegas/bodegas.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { MovimientosModule } from './movimientos/movimientos.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ComprasModule } from './compras/compras.module';
import { AjustesInventarioModule } from './ajustes-inventario/ajustes-inventario.module';
import { PdfModule } from './pdf/pdf.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SolicitudesCompraModule } from './solicitudes-compra/solicitudes-compra.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { DespachosModule } from './despachos/despachos.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { PublicModule } from './public/public.module';
import { TraspasosModule } from './traspasos/traspasos.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(), 
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true, 
        synchronize: false, 
      }),
    }),


    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),


    UsersModule,
    AuditoriaModule,
    AuthModule,
    ProveedoresModule,
    CategoriasModule,
    MaterialesModule,
    ProyectosModule,
    BodegasModule,
    InventarioModule,
    MovimientosModule,
    RequirementsModule,
    ComprasModule,
    AjustesInventarioModule,
    PdfModule,
    DashboardModule,
    SolicitudesCompraModule,
    CotizacionesModule,
    DespachosModule,
    UnidadesMedidaModule,
    PublicModule,
    TraspasosModule,
  ],
})
export class AppModule {}