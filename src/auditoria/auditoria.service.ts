import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditoriaLog } from './auditoria.schema';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectModel(AuditoriaLog.name) private readonly auditoriaModel: Model<AuditoriaLog>,
  ) {}

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
      console.error('Error al guardar log de auditoria en MongoDB:', error);
    }
  }
}