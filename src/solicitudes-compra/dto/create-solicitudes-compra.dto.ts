import { IsString, IsUUID, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleSolicitudDto {
  @IsNumber()
  materialId: number;

  @IsNumber()
  cantidadRequerida: number;
}

export class CreateSolicitudesCompraDto {
  @IsUUID()
  proyectoId: string;

  @IsUUID()
  usuarioSolicitanteId: string;

  @IsOptional()
  @IsString()
  nivelPrioridad?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleSolicitudDto)
  detalles: DetalleSolicitudDto[];
}
