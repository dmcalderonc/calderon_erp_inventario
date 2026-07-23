import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditoriaLog } from './auditoria.schema';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectModel(AuditoriaLog.name) private readonly auditoriaModel: Model<AuditoriaLog>,
  ) { }

  async registrarAccion(usuario_id: string, accion: string, modulo: string, detalles: any): Promise<void> {
    try {
      const nuevoLog = new this.auditoriaModel({
        usuario_id,
        accion,
        modulo,
        detalles,
      });
      await nuevoLog.save();
    } catch (error) {
      this.logger.error('Error al guardar log de auditoria en MongoDB:', error);
    }
  }

  async obtenerLogsRecientes(): Promise<AuditoriaLog[]> {
    try {
      return await this.auditoriaModel
        .find()
        .sort({ fecha: -1, createdAt: -1 }) 
        .limit(10)
        .exec();
    } catch (error) {
      this.logger.error('Error al obtener logs de auditoria:', error);
      return [];
    }
  }
}
