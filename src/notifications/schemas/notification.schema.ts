import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  tipo: string;

  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop()
  entidad: string;

  @Prop()
  entidadId: string;

  @Prop({ default: false })
  leida: boolean;

  @Prop()
  rolDestino: string;

  @Prop()
  usuarioId: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ rolDestino: 1, leida: 1, createdAt: -1 });
NotificationSchema.index({ usuarioId: 1, leida: 1, createdAt: -1 });
