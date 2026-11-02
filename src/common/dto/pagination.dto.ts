import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/** Parámetros globales de paginación y filtros de catálogo. */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bodegaId?: number;

  @IsOptional()
  @IsIn(['agotado', 'bajo', 'normal'])
  stock?: 'agotado' | 'bajo' | 'normal';
}
