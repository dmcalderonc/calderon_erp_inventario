import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEmail } from 'class-validator';

export class UpdateProveedoreDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ruc?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  razon_social?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
