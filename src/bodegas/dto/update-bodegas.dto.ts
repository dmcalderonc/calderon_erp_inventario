import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateBodegasDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ubicacion?: string;

  @IsOptional()
  @IsBoolean()
  isPrincipal?: boolean;

  @IsOptional()
  @IsUUID()
  proyectoId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
