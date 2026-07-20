import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { EstadoCotizacion } from '../entities/cotizacion.entity';

export class CreateCotizacioneDto {
  @IsNumber()
  solicitudId: number;

  @IsNumber()
  proveedorId: number;

  @IsNumber()
  precioOfertadoTotal: number;

  @IsOptional()
  @IsString()
  archivoRespaldoUrl?: string;

  @IsOptional()
  @IsEnum(EstadoCotizacion)
  estado?: EstadoCotizacion;
}
