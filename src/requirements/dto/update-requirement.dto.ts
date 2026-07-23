import { PartialType } from '@nestjs/mapped-types';
import { CreateRequirementDto } from './create-requirement.dto';
import { IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus } from '../entities/requirement.entity';

// Creamos un sub-DTO para recibir la decisión de cada ítem
export class EvaluacionDetalleDto {
  @IsNumber()
  id: number;

  @IsEnum(['APROBADO', 'RECHAZADO'])
  accion: string;
}

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {
  @IsOptional()
  @IsEnum(RequirementStatus)
  estado?: RequirementStatus;

  // Nuevo campo para recibir la evaluación ítem por ítem
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluacionDetalleDto)
  detallesEvaluar?: EvaluacionDetalleDto[];
}