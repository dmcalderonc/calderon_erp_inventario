import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Body de `POST /dashboard/prediccion/alertas`: vacío = alcance global. */
export class GenerarAlertasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bodegaId?: number;
}
