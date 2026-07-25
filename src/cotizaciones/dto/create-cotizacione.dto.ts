import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCotizacioneDto {
  @IsNumber()
  requerimientoDetalleId: number;

  @IsNumber()
  proveedorId: number;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempoEntregaDias?: number;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  archivoRespaldoUrl?: string;

  @IsOptional()
  @IsNumber()
  solicitudCompraId?: number;
}
