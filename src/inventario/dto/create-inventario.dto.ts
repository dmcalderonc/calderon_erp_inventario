
import { IsNumber, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateInventarioDto {
  @IsNotEmpty()
  @IsInt()
  material_id: number;

  @IsNotEmpty()
  @IsInt()
  bodega_id: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_disponible?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_reservada?: number;
}
