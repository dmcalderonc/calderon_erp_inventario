import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion, EstadoCotizacion } from './entities/cotizacion.entity';
import { CreateCotizacioneDto } from './dto/create-cotizacione.dto';
import { UpdateCotizacioneDto } from './dto/update-cotizacione.dto';
import { SolicitudCompra, EstadoSolicitud } from '../solicitudes-compra/entities/solicitud-compra.entity';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
    @InjectRepository(SolicitudCompra)
    private readonly solicitudRepository: Repository<SolicitudCompra>,
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

  async seleccionar(id: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);

    if (cotizacion.estado !== EstadoCotizacion.EN_EVALUACION) {
      throw new BadRequestException(
        `Solo se pueden seleccionar cotizaciones en estado EN_EVALUACION. Estado actual: ${cotizacion.estado}`,
      );
    }

    cotizacion.estado = EstadoCotizacion.ELEGIDA;
    await this.cotizacionRepository.save(cotizacion);

    if (cotizacion.solicitudId) {
      const solicitud = await this.solicitudRepository.findOne({
        where: { id: cotizacion.solicitudId },
      });
      if (solicitud) {
        solicitud.estado = EstadoSolicitud.APROBADA;
        await this.solicitudRepository.save(solicitud);
      }
    }

    return cotizacion;
  }

  async descartar(id: number): Promise<Cotizacion> {
    const cotizacion = await this.findOne(id);
    cotizacion.estado = EstadoCotizacion.DESCARTADA;
    return await this.cotizacionRepository.save(cotizacion);
  }
}
