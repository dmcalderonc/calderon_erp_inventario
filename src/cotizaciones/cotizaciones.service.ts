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

  async create(dto: CreateCotizacioneDto, usuarioId?: string): Promise<Cotizacion> {
    const nueva = this.cotizacionRepository.create({
      solicitudId: dto.solicitudId,
      proveedorId: dto.proveedorId,
      precioOfertadoTotal: dto.precioOfertadoTotal,
      archivoRespaldoUrl: dto.archivoRespaldoUrl,
      estado: dto.estado,
      ...(usuarioId && { usuarioId }),
    });
    return await this.cotizacionRepository.save(nueva);
  }

  async findAll(userId?: string, rol?: string): Promise<Cotizacion[]> {
    const where: any = {};
    if (rol === 'COMPRADOR' && userId) {
      where.usuarioId = userId;
    }
    return await this.cotizacionRepository.find({
      where,
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
