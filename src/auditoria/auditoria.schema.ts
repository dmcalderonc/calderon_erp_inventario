// src/auditoria/schemas/auditoria.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AuditoriaLog extends Document {
  @Prop({ required: true })
  usuario_id?: string;

  @Prop({ required: true })
  accion?: string;

  @Prop({ required: true })
  modulo?: string;

  @Prop({ type: Object })
  detalles?: Record<string, any>;
}

export const AuditoriaLogSchema = SchemaFactory.createForClass(AuditoriaLog);