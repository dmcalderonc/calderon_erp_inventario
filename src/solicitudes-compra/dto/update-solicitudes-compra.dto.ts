import { PartialType } from '@nestjs/swagger';
import { CreateSolicitudesCompraDto } from './create-solicitudes-compra.dto';

export class UpdateSolicitudesCompraDto extends PartialType(CreateSolicitudesCompraDto) {}
