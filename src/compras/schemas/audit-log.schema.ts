import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) 
export class AuditLog extends Document {
  @Prop()
  ordenCompraId?: number;

  @Prop()
  estadoAnterior?: string;

  @Prop()
  estadoNuevo?: string;

  @Prop()
  usuarioId?: string; 
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);