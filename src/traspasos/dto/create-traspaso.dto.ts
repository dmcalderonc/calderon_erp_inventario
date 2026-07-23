import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class DetalleTraspasoDto {
  @IsNumber()
  materialId: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreateTraspasoDto {
  @IsNumber()
  bodegaOrigenId: number;

  @IsNumber()
  bodegaDestinoId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleTraspasoDto)
  detalles: DetalleTraspasoDto[];
}
