import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAjusteInventarioDto } from './dto/create-ajustes-inventario.dto';
import { AjusteInventario } from './entities/ajustes-inventario.entity';
import { DetalleAjuste } from './entities/detalle-ajuste.entity';
import { Inventario } from '../inventario/inventario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class AjustesInventarioService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) { }

  findAll() {
    return this.dataSource.getRepository(AjusteInventario).find({
      relations: { bodega: true, detalles: { material: true } },
      order: { fechaAjuste: 'DESC' },
    });
  }

  async ejecutarAjusteFisico(createAjusteDto: CreateAjusteInventarioDto, usuarioId: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { bodegaId, motivo, detalles } = createAjusteDto;
      const logsCriticos: any[] = []; 
      const nuevoAjuste = queryRunner.manager.create(AjusteInventario, {
        bodegaId,
        motivo,
        usuarioAutorizadorId: usuarioId,
      });
      const ajusteGuardado = await queryRunner.manager.save(nuevoAjuste);

      for (const detalle of detalles) {

        let inventario = await queryRunner.manager.findOne(Inventario, {
          where: { bodega_id: bodegaId, materialId: detalle.materialId },
        });

        if (!inventario) {
          throw new NotFoundException(`El material ${detalle.materialId} no existe en la bodega ${bodegaId}`);
        }

        const stockSistemaAnterior = inventario.cantidad_disponible ?? 0;
        const diferenciaCalculada = detalle.stockFisico - stockSistemaAnterior;

        inventario.cantidad_disponible = detalle.stockFisico;
        await queryRunner.manager.save(inventario);


        const nuevoDetalle = queryRunner.manager.create(DetalleAjuste, {
          ajusteId: ajusteGuardado.id,
          materialId: detalle.materialId,
          stockSistema: stockSistemaAnterior,
          stockFisico: detalle.stockFisico,
          diferencia: diferenciaCalculada,
        });
        await queryRunner.manager.save(nuevoDetalle);
        logsCriticos.push({
          materialId: detalle.materialId,
          stockSistema: stockSistemaAnterior,
          stockFisicoReal: detalle.stockFisico,
          diferencia: diferenciaCalculada
        });
      }

      await queryRunner.commitTransaction();

      this.auditoriaService.registrarAccion(
        usuarioId,
        'AJUSTE_FISICO_INVENTARIO',
        'INVENTARIO',
        {
          severidad: 'CRITICAL_WARNING',
          ajusteId: ajusteGuardado.id,
          bodegaId,
          motivo,
          impactoMasivo: logsCriticos
        }
      );

      return {
        message: 'Ajuste de inventario ejecutado correctamente.',
        ajusteId: ajusteGuardado.id
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error en transacción de ajuste:', error);
      throw new InternalServerErrorException(error.message);
    } finally {
      await queryRunner.release();
    }
  }
}