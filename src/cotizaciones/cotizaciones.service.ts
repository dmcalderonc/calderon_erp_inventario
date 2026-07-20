import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from './entities/cotizacion.entity';
import { CreateCotizacioneDto } from './dto/create-cotizacione.dto';
import { UpdateCotizacioneDto } from './dto/update-cotizacione.dto';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
  ) {}

  async create(dto: CreateCotizacioneDto): Promise<Cotizacion> {
    const nueva = this.cotizacionRepository.create(dto);
    return await this.cotizacionRepository.save(nueva);
  }

  async findAll(): Promise<Cotizacion[]> {
    return await this.cotizacionRepository.find({
      relations: { solicitud: true, proveedor: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { id },
      relations: { solicitud: true, proveedor: true },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización #${id} no encontrada`);
    }
    return cotizacion;
  }

  async update(id: number, dto: UpdateCotizacioneDto): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    this.cotizacionRepository.merge(cotizacion, dto);
    return await this.cotizacionRepository.save(cotizacion);
  }

  async remove(id: number): Promise<void> {
    const cotizacion = await this.findOne(id);
    await this.cotizacionRepository.remove(cotizacion);
  }
}
