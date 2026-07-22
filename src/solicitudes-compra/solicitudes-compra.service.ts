import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudCompra, EstadoSolicitud } from './entities/solicitud-compra.entity';
import { CreateSolicitudesCompraDto } from './dto/create-solicitudes-compra.dto';

@Injectable()
export class SolicitudesCompraService {
  constructor(
    @InjectRepository(SolicitudCompra)
    private readonly solicitudRepository: Repository<SolicitudCompra>,
  ) { }

  async create(dto: CreateSolicitudesCompraDto): Promise<SolicitudCompra> {
    const codigo = `SC-${Date.now()}`;
    const solicitud = this.solicitudRepository.create({
      codigo,
      proyectoId: dto.proyectoId,
      usuarioSolicitanteId: dto.usuarioSolicitanteId,
      nivelPrioridad: (dto.nivelPrioridad as any) || 'MEDIA',
      estado: EstadoSolicitud.PENDIENTE,
      detalles: dto.detalles.map(d => ({
        materialId: d.materialId,
        cantidadRequerida: d.cantidadRequerida,
      })),
    });
    return await this.solicitudRepository.save(solicitud);
  }

  async findAll(estado?: EstadoSolicitud, proyectoId?: string, userId?: string, rol?: string): Promise<SolicitudCompra[]> {
    const query = this.solicitudRepository.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.detalles', 'detalles')
      .leftJoinAndSelect('solicitud.cotizaciones', 'cotizaciones')
      .leftJoinAndSelect('solicitud.proyecto', 'proyecto')
      .leftJoinAndSelect('solicitud.usuarioSolicitante', 'usuario');

    if (estado) {
      query.andWhere('solicitud.estado = :estado', { estado });
    }
    if (proyectoId) {
      query.andWhere('solicitud.proyectoId = :proyectoId', { proyectoId });
    }
    if ((rol === 'COMPRADOR' || rol === 'SOLICITANTE') && userId) {
      query.andWhere('solicitud.usuarioSolicitanteId = :userId', { userId });
    }

    return await query.orderBy('solicitud.fechaSolicitud', 'DESC').getMany();
  }

  async update(id: number, updateDto: any, usuarioActualId: string, rolUsuario: string) {
    const solicitud = await this.solicitudRepository.findOneBy({ id });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud #${id} no encontrada`);
    }

    if (rolUsuario === 'SOLICITANTE') {
      if (solicitud.estado === EstadoSolicitud.COTIZANDO || solicitud.estado === EstadoSolicitud.APROBADA) {
        throw new ForbiddenException('Bloqueo de seguridad: No puedes editar una solicitud que ya está siendo procesada por Adquisiciones.');
      }
      if (solicitud.usuarioSolicitanteId !== usuarioActualId) {
        throw new ForbiddenException('Acceso denegado: Solo puedes modificar tus propias solicitudes.');
      }
    }

    try {
      this.solicitudRepository.merge(solicitud, updateDto);
      return await this.solicitudRepository.save(solicitud);
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar la solicitud de compra.');
    }
  }
}