import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateMaterialDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsNotEmpty()
  @IsInt({ message: 'La unidad de medida debe ser un ID válido' })
  unidad_medida_id: number;

  @IsNotEmpty()
  @IsInt()
  categoria_id: number;
}
