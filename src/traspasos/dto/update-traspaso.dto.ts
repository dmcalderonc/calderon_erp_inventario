import { IsString, IsOptional } from 'class-validator';

export class UpdateTraspasoDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}
