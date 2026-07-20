import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { TipoMovimiento } from '../entities/movimiento-inventario.entity';

export class DetalleMovimientoDto {
  @IsNumber()
  materialId?: number;

  @IsInt()
  @Min(1)
  cantidad?: number;
}

export class CreateMovimientoDto {
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsOptional()
  bodegaOrigenId?: number;

  @IsNumber()
  @IsOptional()
  bodegaDestinoId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleMovimientoDto)
  detalles?: DetalleMovimientoDto[];
}