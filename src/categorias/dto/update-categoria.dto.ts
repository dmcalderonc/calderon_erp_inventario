import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateCategoriaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prefijo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
