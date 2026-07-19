import { Injectable } from '@nestjs/common';
import { CreateCotizacioneDto } from './dto/create-cotizacione.dto';
import { UpdateCotizacioneDto } from './dto/update-cotizacione.dto';

@Injectable()
export class CotizacionesService {
  create(createCotizacioneDto: CreateCotizacioneDto) {
    return 'This action adds a new cotizacione';
  }

  findAll() {
    return `This action returns all cotizaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cotizacione`;
  }

  update(id: number, updateCotizacioneDto: UpdateCotizacioneDto) {
    return `This action updates a #${id} cotizacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} cotizacione`;
  }
}
