import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SolicitudCompra, EstadoSolicitud, NivelPrioridad } from './entities/solicitud-compra.entity';
import { CreateSolicitudesCompraDto } from './dto/create-solicitudes-compra.dto';
import { UpdateSolicitudesCompraDto } from './dto/update-solicitudes-compra.dto';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SolicitudesCompraService {
  constructor(
    @InjectRepository(SolicitudCompra)
    private readonly solicitudRepository: Repository<SolicitudCompra>,
    private readonly dataSource: DataSource,
  ) { }

  async create(dto: CreateSolicitudesCompraDto): Promise<SolicitudCompra> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lógica de Código Secuencial replicada de Proyectos
      const anioActual = new Date().getFullYear();
      const totalSolicitudes = await queryRunner.manager.count(SolicitudCompra);
      const correlativo = (totalSolicitudes + 1).toString().padStart(3, '0');
      const codigo = `SC-${anioActual}-${correlativo}`;

      const nuevaSolicitud = queryRunner.manager.create(SolicitudCompra, {
        codigo,
        proyectoId: dto.proyectoId,
        usuarioSolicitanteId: dto.usuarioSolicitanteId,
        nivelPrioridad: (dto.nivelPrioridad as NivelPrioridad) || NivelPrioridad.MEDIA,
        estado: EstadoSolicitud.PENDIENTE,
        detalles: dto.detalles.map(d => ({
          materialId: d.materialId,
          cantidadRequerida: d.cantidadRequerida,
        })),
      });

      const solicitudGuardada = await queryRunner.manager.save(nuevaSolicitud);
      await queryRunner.commitTransaction();
      return solicitudGuardada;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error transaccional al crear la solicitud de compra: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(estado?: EstadoSolicitud, proyectoId?: string): Promise<SolicitudCompra[]> {
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

    return await query.orderBy('solicitud.fechaSolicitud', 'DESC').getMany();
  }

  async update(id: number, updateDto: UpdateSolicitudesCompraDto, usuarioActualId: string, rolUsuario: string) {
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
      this.solicitudRepository.merge(solicitud, updateDto as any);
      return await this.solicitudRepository.save(solicitud);
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar la solicitud de compra.');
    }
  }

  async findOne(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id },
      relations: { detalles: true, cotizaciones: true, proyecto: true, usuarioSolicitante: true },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud #${id} no encontrada`);
    }
    return solicitud;
  }

  async cotizar(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden poner en cotización solicitudes en estado PENDIENTE. Estado actual: ${solicitud.estado}`,
      );
    }

    solicitud.estado = EstadoSolicitud.COTIZANDO;
    return await this.solicitudRepository.save(solicitud);
  }

  async aprobar(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado !== EstadoSolicitud.COTIZANDO) {
      throw new BadRequestException(
        `Solo se pueden aprobar solicitudes en estado COTIZANDO. Estado actual: ${solicitud.estado}`,
      );
    }

    solicitud.estado = EstadoSolicitud.APROBADA;
    return await this.solicitudRepository.save(solicitud);
  }

  async procesar(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.findOne(id);

    if (solicitud.estado !== EstadoSolicitud.APROBADA) {
      throw new BadRequestException(
        `Solo se pueden procesar solicitudes en estado APROBADA. Estado actual: ${solicitud.estado}`,
      );
    }

    solicitud.estado = EstadoSolicitud.PROCESADO;
    return await this.solicitudRepository.save(solicitud);
  }

  // 🔥 Oído (Listener) para autogenerar solicitudes por falta de stock
  @OnEvent('requerimiento.en_compras')
  async handleRequerimientoEnCompras(payload: {
    requirementId: number;
    materialId: number;
    cantidad: number;
    proyectoId: string;
  }) {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Replicamos la misma lógica del folio aquí adentro
      const anioActual = new Date().getFullYear();
      const totalSolicitudes = await queryRunner.manager.count(SolicitudCompra);
      const correlativo = (totalSolicitudes + 1).toString().padStart(3, '0');
      const codigo = `SC-${anioActual}-${correlativo}`;

      const nuevaSolicitud = queryRunner.manager.create(SolicitudCompra, {
        codigo,
        proyectoId: payload.proyectoId,
        nivelPrioridad: NivelPrioridad.ALTA,
        estado: EstadoSolicitud.PENDIENTE,
        detalles: [
          {
            materialId: payload.materialId,
            cantidadRequerida: payload.cantidad,
          }
        ]
      });

      await queryRunner.manager.save(nuevaSolicitud);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}