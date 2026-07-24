import { Injectable } from '@nestjs/common';
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

  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(id, { leida: true }).exec();
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
}
