import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  @OnEvent('notificacion.crear')
  async handleNotificacion(payload: {
    tipo: string;
    titulo: string;
    mensaje: string;
    entidad?: string;
    entidadId?: string;
    rolDestino?: string;
    usuarioId?: string;
  }) {
    try {
      const doc: any = {
        tipo: payload.tipo,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        leida: false,
      };
      if (payload.entidad) doc.entidad = payload.entidad;
      if (payload.entidadId) doc.entidadId = payload.entidadId;
      if (payload.rolDestino) doc.rolDestino = payload.rolDestino;
      if (payload.usuarioId) doc.usuarioId = payload.usuarioId;
      await this.notificationModel.create(doc);
    } catch (e) {
      console.error('[NotificationsService] Error al crear notificación:', e);
    }
  }

  async findAll(rol?: string, usuarioId?: string) {
    const filter: any = {};
    if (usuarioId) {
      filter.$or = [
        { usuarioId },
        { rolDestino: rol },
      ];
    } else if (rol) {
      filter.rolDestino = rol;
    }
    return this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async countUnread(rol?: string, usuarioId?: string) {
    const filter: any = { leida: false };
    if (usuarioId) {
      filter.$or = [
        { usuarioId },
        { rolDestino: rol },
      ];
    } else if (rol) {
      filter.rolDestino = rol;
    }
    return this.notificationModel.countDocuments(filter).exec();
  }

  async markAsRead(id: string, rol?: string, usuarioId?: string) {
    // Solo se puede marcar como leída una notificación propia o de su rol (evita IDOR).
    const filter: any = { _id: id };
    if (usuarioId) {
      filter.$or = [{ usuarioId }, { rolDestino: rol }];
    } else if (rol) {
      filter.rolDestino = rol;
    }

    const actualizada = await this.notificationModel.findOneAndUpdate(filter, { leida: true }).exec();
    if (!actualizada) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    return actualizada;
  }

  async markAllAsRead(rol?: string, usuarioId?: string) {
    const filter: any = { leida: false };
    if (usuarioId) {
      filter.$or = [
        { usuarioId },
        { rolDestino: rol },
      ];
    } else if (rol) {
      filter.rolDestino = rol;
    }
    return this.notificationModel.updateMany(filter, { leida: true }).exec();
  }

  /** Anti-spam: ¿ya existe una notificación sin leer para esta entidad en las últimas `horas`? */
  async existeNoLeidaReciente(
    tipo: string,
    entidadId: string,
    horas: number = 24,
  ): Promise<boolean> {
    const desde = new Date(Date.now() - horas * 3600 * 1000);
    const existe = await this.notificationModel
      .exists({ tipo, entidadId, leida: false, createdAt: { $gte: desde } })
      .exec();
    return Boolean(existe);
  }
}
