import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AjustesInventarioService } from './ajustes-inventario.service';
import { AjustesInventarioController } from './ajustes-inventario.controller';
import { AjusteInventario } from './entities/ajustes-inventario.entity';
import { DetalleAjuste } from './entities/detalle-ajuste.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([AjusteInventario, DetalleAjuste]),
    AuditoriaModule, 
  ],
  controllers: [AjustesInventarioController],
  providers: [AjustesInventarioService],
})
export class AjustesInventarioModule {}