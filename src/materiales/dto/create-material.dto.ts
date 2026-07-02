import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt } from 'class-validator';

export class CreateMaterialDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNotEmpty()
  @IsEnum(['U', 'KG', 'M', 'M2'], { message: 'Unidad de medida no válida' })
  unidad_medida: string;

  @IsNotEmpty()
  @IsInt()
  categoria_id: number;
}