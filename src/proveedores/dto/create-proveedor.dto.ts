import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @Length(13, 13, { message: 'El RUC debe tener exactamente 13 dígitos' })
  ruc?: string;

  @IsString()
  @IsNotEmpty()
  razon_social?: string;

  @IsEmail()
  email?: string;

  @IsString()
  telefono?: string;

  @IsString()
  direccion?: string;
}