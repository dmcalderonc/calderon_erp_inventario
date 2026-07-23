
import { IsNumber, IsInt } from 'class-validator';

export class CreateInventarioDto {
  @IsInt()
  material_id?: number;

  @IsInt()
  bodega_id?: number;

  @IsNumber()
  cantidad_disponible?: number;

  @IsNumber()
  cantidad_reservada?: number;
}
