import { IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Query params de `GET /dashboard/prediccion`. */
export class PrediccionQueryDto {
  /** Ventana móvil de análisis en días (7–90). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  dias: number = 30;

  /** Días por debajo del cual el material es CRÍTICO. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  umbralCritico: number = 7;

  /** Días por debajo del cual el material está en RIESGO. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  umbralRiesgo: number = 15;

  /** `true` → solo alertas. Se usa `@Transform` porque `Boolean("false")` es `true`. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloAlertas: boolean = false;

  /** Acota el análisis a una bodega (se valida contra el JWT). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bodegaId?: number;

  /** Máximo de materiales devueltos, ya ordenados por urgencia. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limite: number = 100;
}
