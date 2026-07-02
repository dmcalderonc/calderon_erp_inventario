import { PartialType } from '@nestjs/mapped-types';
import { CreateBodegaDto } from './create-bodegas.dto';

export class UpdateBodegasDto extends PartialType(CreateBodegaDto) {
}
