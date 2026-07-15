import { IsInt, IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleAjusteDto {
  @IsInt()
  @IsNotEmpty()
  materialId: number;

  @IsInt()
  @IsNotEmpty()
  stockFisico: number;
}

export class CreateAjusteInventarioDto {
  @IsInt()
  @IsNotEmpty()
  bodegaId: number;

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleAjusteDto)
  detalles: CreateDetalleAjusteDto[];
}