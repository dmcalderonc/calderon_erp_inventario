import { IsUUID, IsArray, ValidateNested, IsNumber, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class RequirementDetailDto {
  @IsNumber()
  materialId: number;

  @IsInt()
  @Min(1)
  cantidadSolicitada: number;
}

export class CreateRequirementDto {
  @IsUUID()
  proyectoId: string;

  @IsNumber()
  bodegaId: number;

  @IsOptional()
  @IsString()
  justificativo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementDetailDto)
  detalles: RequirementDetailDto[];
}
