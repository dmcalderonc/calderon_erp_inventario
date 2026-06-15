// src/auditoria/auditoria.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaLog, AuditoriaLogSchema } from './auditoria.schema'; 

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditoriaLog.name, schema: AuditoriaLogSchema }]),
  ],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}