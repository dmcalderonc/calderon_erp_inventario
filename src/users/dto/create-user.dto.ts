import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(UserRole, { message: 'Rol no válido' })
  rol: UserRole;

  @IsOptional()
  is_active?: boolean;

  @IsInt()
  @IsOptional()
  bodega_id?: number;

  @IsOptional()
  @IsString()
  fotoPerfil?: string;
}