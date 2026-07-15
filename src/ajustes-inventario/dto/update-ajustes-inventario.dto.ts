import { PartialType } from '@nestjs/mapped-types';
import { CreateAjusteInventarioDto } from './create-ajustes-inventario.dto'; 

export class UpdateAjustesInventarioDto extends PartialType(CreateAjusteInventarioDto) {}