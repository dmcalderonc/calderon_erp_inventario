import { PartialType } from '@nestjs/swagger';
import { CreateCotizacioneDto } from './create-cotizacione.dto';

export class UpdateCotizacioneDto extends PartialType(CreateCotizacioneDto) {}
