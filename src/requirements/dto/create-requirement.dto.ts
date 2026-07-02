import { IsUUID, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RequirementDetailDto {
  @IsNumber()
  materialId: number;

  @IsNumber()
  @Min(0.1)
  cantidadSolicitada: number;
}

export class CreateRequirementDto {
  @IsUUID()
  proyectoId: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementDetailDto)
  detalles: RequirementDetailDto[];
}