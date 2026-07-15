import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Requirement, RequirementStatus } from './entities/requirement.entity';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { Inventario } from '../inventario/inventario.entity';
import { MovimientoInventario, TipoMovimiento, EstadoMovimiento } from '../movimientos/entities/movimiento-inventario.entity';
import { DetalleMovimiento } from '../movimientos/entities/detalle-movimiento.entity';

@Injectable()
export class RequirementsService {
  private readonly BODEGA_CENTRAL_ID = 1;

  constructor(
    @InjectRepository(Requirement)
    private reqRepository: Repository<Requirement>,
    private dataSource: DataSource,
  ) { }

  async create(createDto: CreateRequirementDto, userId: string) {
  try {
    const requirement = this.reqRepository.create({
      proyectoId: createDto.proyectoId,
      usuarioSolicitanteId: userId, 
      estado: RequirementStatus.PENDIENTE,
      detalles: createDto.detalles.map(detalle => ({
        materialId: detalle.materialId,
        cantidadSolicitada: detalle.cantidadSolicitada,
      })),
    });
    
    return await this.reqRepository.save(requirement);
  } catch (error) {
    console.log('--- ERROR DETALLADO ---');
    console.log(error); 
    throw new InternalServerErrorException(error.message);
  }
}

  async updateStatus(id: number, updateDto: UpdateRequirementDto, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const req = await queryRunner.manager.findOne(Requirement, {
        where: { id },
        relations: {
          detalles: true,
          proyecto: { bodega: true },
        },
      });

      if (!req) throw new NotFoundException('Requerimiento no encontrado');

      if (updateDto.estado === RequirementStatus.APROBADO && req.estado === RequirementStatus.PENDIENTE) {
        for (const detalle of req.detalles) {
          const stock = await queryRunner.manager.findOne(Inventario, {
            where: { bodega: { id: this.BODEGA_CENTRAL_ID }, material: { id: detalle.materialId } },
          });

          const disponible = Number(stock?.cantidad_disponible || 0);
          if (!stock || disponible < detalle.cantidadSolicitada) {
            throw new BadRequestException(`Stock insuficiente para el material ID: ${detalle.materialId}`);
          }

          stock.cantidad_disponible = disponible - detalle.cantidadSolicitada;
          stock.cantidad_reservada = Number(stock.cantidad_reservada || 0) + detalle.cantidadSolicitada;
          await queryRunner.manager.save(stock);
        }
      }

      else if (updateDto.estado === RequirementStatus.ATENDIDO && req.estado === RequirementStatus.APROBADO) {
        const movimiento = queryRunner.manager.create(MovimientoInventario, {
          tipo: TipoMovimiento.TRANSFERENCIA,
          fecha: new Date(),
          observaciones: `Egreso automático por Requerimiento REQ-${req.id}`,
          usuarioId: userId,
          bodegaOrigenId: this.BODEGA_CENTRAL_ID,
          bodegaDestinoId: req.proyecto.bodega?.id || null,
          estado: EstadoMovimiento.PROCESADO,
        } as any);

        const movimientoGuardado = await queryRunner.manager.save(movimiento);

        for (const detalle of req.detalles) {
          const stock = await queryRunner.manager.findOne(Inventario, {
            where: { bodega: { id: this.BODEGA_CENTRAL_ID }, material: { id: detalle.materialId } },
          });

          if (stock) {
            stock.cantidad_reservada = Number(stock.cantidad_reservada || 0) - detalle.cantidadSolicitada;
            await queryRunner.manager.save(stock);
          }

          const detalleMov = queryRunner.manager.create(DetalleMovimiento, {
            movimientoId: movimientoGuardado.id,
            materialId: detalle.materialId,
            cantidad: detalle.cantidadSolicitada,
          } as any);
          await queryRunner.manager.save(detalleMov);
        }
      }

      req.estado = updateDto.estado;
      const result = await queryRunner.manager.save(req);

      await queryRunner.commitTransaction();
      return result;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException || error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Error procesando el requerimiento: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.reqRepository.find({
      relations: { detalles: true, proyecto: true, usuarioSolicitante: true }
    });
  }

  async findOne(id: number) {
    return await this.reqRepository.findOne({
      where: { id },
      relations: { detalles: { material: true }, proyecto: true }
    });
  }

  async remove(id: number) {
    return await this.reqRepository.delete(id);
  }
}