import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El prefijo debe ser un texto' })
  @IsNotEmpty({ message: 'El prefijo es obligatorio' })
  @MaxLength(10, { message: 'El prefijo no puede tener más de 10 caracteres' })
  prefijo: string;
}