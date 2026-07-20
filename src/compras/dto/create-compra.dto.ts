import { IsNotEmpty, IsNumber, IsInt, IsPositive, IsArray, ValidateNested, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class DetalleDto {
  @IsNumber()
  @IsPositive()
  materialId?: number;

  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsNumber()
  @IsPositive()
  precioUnitario?: number;
}

export class CreateCompraDto {
  @IsNotEmpty()
  @IsNumber()
  proveedorId?: number;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  impuestos?: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleDto)
  detalles?: DetalleDto[];
}