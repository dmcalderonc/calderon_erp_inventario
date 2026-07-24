import { IsEmail, IsEnum, IsNotEmpty, IsString, IsOptional, IsNumber, MinLength, IsArray, ArrayMinSize } from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(UserRole, { message: 'Rol no válido' })
  rol: UserRole;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  bodegaIds?: number[];
}