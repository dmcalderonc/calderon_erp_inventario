import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdenCompra } from './entities/orden-compra.entity';
import { MovimientosService } from '../movimientos/movimientos.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { Cotizacion, EstadoCotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(OrdenCompra)
    private readonly ocRepository: Repository<OrdenCompra>,
    @InjectModel('AuditLog') private readonly auditModel: Model<any>,
    private readonly movimientosService: MovimientosService,
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,
  ) { }

  async create(dto: any) {
    try {
      if (dto.solicitudId) {
        const cotizacionElegida = await this.cotizacionRepository.findOne({
          where: {
            solicitudId: dto.solicitudId,
            estado: EstadoCotizacion.ELEGIDA
          }
        });

        if (!cotizacionElegida) {
          throw new ForbiddenException('Políticas de Adquisición: No se puede emitir la Orden de Compra sin una cotización aprobada (ELEGIDA).');
        }
      }

      const nuevoCodigo = `OC-${Date.now()}`;
      const nuevaOrden = this.ocRepository.create({
        ...dto,
        codigo: nuevoCodigo,
        estado: 'BORRADOR',
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : new Date(),
      });
      return await this.ocRepository.save(nuevaOrden);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('No se pudo crear la orden de compra');
    }
  }

  async recibirOrden(id: number, usuarioId: string) {
    const orden = await this.ocRepository.findOneBy({ id });
    if (!orden) throw new NotFoundException('Orden no encontrada');


    await this.auditModel.create({
      ordenCompraId: id,
      estadoAnterior: orden.estado,
      estadoNuevo: 'RECIBIDA',
      usuarioId: usuarioId,
      fecha: new Date(),
    });


    orden.estado = 'RECIBIDA';
    await this.ocRepository.save(orden);


    await this.movimientosService.registrarMovimiento({
      tipo: 'INGRESO',
      observaciones: `Ingreso automático por OC-${orden.id}`,
      usuarioId: usuarioId,
      bodegaDestinoId: 1,
      detalles: []
    } as any, usuarioId);

    return { mensaje: 'Orden recibida con éxito' };
  }

  findAll() { return this.ocRepository.find(); }
  findOne(id: number) { return this.ocRepository.findOneBy({ id }); }
  update(id: number, dto: UpdateCompraDto) { return this.ocRepository.update(id, dto); }
  remove(id: number) { return this.ocRepository.delete(id); }
}

