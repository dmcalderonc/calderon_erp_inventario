import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateBodegaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsBoolean()
  @IsOptional()
  isPrincipal?: boolean;

  @IsUUID()
  @IsOptional()
  proyectoId?: string;
}