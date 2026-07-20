import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Requirement, RequirementStatus } from './entities/requirement.entity';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { Inventario } from '../inventario/inventario.entity';

@Injectable()
export class RequirementsService {
  private readonly BODEGA_CENTRAL_ID = 1;

  constructor(
    @InjectRepository(Requirement)
    private reqRepository: Repository<Requirement>,
    private dataSource: DataSource,
  ) {}

  async create(createDto: CreateRequirementDto, userId: string) {
    const requirement = this.reqRepository.create({
      proyectoId: createDto.proyectoId,
      usuarioSolicitanteId: userId,
      estado: RequirementStatus.PENDIENTE,
      detalles: createDto.detalles.map((detalle) => ({
        materialId: detalle.materialId,
        cantidadSolicitada: detalle.cantidadSolicitada,
      })),
    });

    return await this.reqRepository.save(requirement);
  }

  async updateStatus(id: number, updateDto: UpdateRequirementDto, userId?: string) {
    const req = await this.reqRepository.findOne({
      where: { id },
      relations: { detalles: true, proyecto: { bodega: true } },
    });

    if (!req) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateDto.estado === RequirementStatus.APROBADO && req.estado === RequirementStatus.PENDIENTE) {
        for (const det of req.detalles) {
          const stock = await queryRunner.manager.findOne(Inventario, {
            where: {
              materialId: Number(det.materialId),
              bodega_id: this.BODEGA_CENTRAL_ID,
            },
          });

          const cantidadReq = Number(det.cantidadSolicitada);

          if (!stock || (stock.cantidad_disponible || 0) < cantidadReq) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(
              `Stock insuficiente para material ${det.materialId}. Disponible: ${stock?.cantidad_disponible || 0}, Requerido: ${cantidadReq}`,
            );
          }

          stock.cantidad_disponible = (stock.cantidad_disponible || 0) - cantidadReq;
          stock.cantidad_reservada = (stock.cantidad_reservada || 0) + cantidadReq;
          await queryRunner.manager.save(stock);
        }

        req.estado = RequirementStatus.APROBADO;

      } else if (updateDto.estado === RequirementStatus.ATENDIDO && req.estado === RequirementStatus.APROBADO) {
        const bodegaDestinoId = req.proyecto?.bodega?.id;

        for (const det of req.detalles) {
          const cantidadDespachada = Number(det.cantidadDespachada || det.cantidadSolicitada);
          const materialId = Number(det.materialId);

          await queryRunner.manager.decrement(
            Inventario,
            { materialId, bodega_id: this.BODEGA_CENTRAL_ID },
            'cantidad_reservada',
            cantidadDespachada,
          );

          await queryRunner.manager.decrement(
            Inventario,
            { materialId, bodega_id: this.BODEGA_CENTRAL_ID },
            'cantidad_disponible',
            cantidadDespachada,
          );

          if (bodegaDestinoId) {
            const stockDestino = await queryRunner.manager.findOne(Inventario, {
              where: { materialId, bodega_id: Number(bodegaDestinoId) },
            });

            if (stockDestino) {
              stockDestino.cantidad_disponible = (stockDestino.cantidad_disponible || 0) + cantidadDespachada;
              await queryRunner.manager.save(stockDestino);
            } else {
              const nuevoStock = queryRunner.manager.create(Inventario, {
                materialId,
                bodega_id: Number(bodegaDestinoId),
                cantidad_disponible: cantidadDespachada,
                cantidad_reservada: 0,
              });
              await queryRunner.manager.save(nuevoStock);
            }
          }

          det.cantidadDespachada = cantidadDespachada;
          det.estadoItem = 'DESPACHADO' as any;
          await queryRunner.manager.save(det);
        }

        req.estado = RequirementStatus.ATENDIDO;

      } else {
        throw new BadRequestException(
          `Transición no válida: ${req.estado} → ${updateDto.estado}`,
        );
      }

      await queryRunner.manager.save(req);
      await queryRunner.commitTransaction();

      return this.reqRepository.findOne({
        where: { id },
        relations: { detalles: true, proyecto: true },
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId?: string, rol?: string) {
    const where: any = {};
    if (rol === 'SOLICITANTE' && userId) {
      where.usuarioSolicitanteId = userId;
    }
    return await this.reqRepository.find({
      where,
      relations: { detalles: true, proyecto: true, usuarioSolicitante: true },
    });
  }

  async findOne(id: number, userId?: string, rol?: string) {
    const where: any = { id };
    if (rol === 'SOLICITANTE' && userId) {
      where.usuarioSolicitanteId = userId;
    }
    return await this.reqRepository.findOne({
      where,
      relations: { detalles: { material: true }, proyecto: true },
    });
  }

  async remove(id: number) {
    return await this.reqRepository.delete(id);
  }
}
