import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateUnidadMedidaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  simbolo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
