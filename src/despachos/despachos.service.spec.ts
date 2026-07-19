import { Test, TestingModule } from '@nestjs/testing';
import { DespachosService } from './despachos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Proyecto } from '../proyectos/proyecto.entity';
import {
  Requirement,
  RequirementStatus,
} from '../requirements/entities/requirement.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
} from '../movimientos/entities/movimiento-inventario.entity';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MovimientosService } from '../movimientos/movimientos.service';

describe('DespachosService', () => {
  let service: DespachosService;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockProyectoRepository = {
    findOne: jest.fn(),
  };

  const mockAuditModel = {
    create: jest.fn(),
  };

  const mockMovimientosService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DespachosService,
        {
          provide: getRepositoryToken(Proyecto),
          useValue: mockProyectoRepository,
        },
        {
          provide: getRepositoryToken(Requirement),
          useValue: { findOne: jest.fn() },
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getModelToken('AuditLog'), useValue: mockAuditModel },
        { provide: MovimientosService, useValue: mockMovimientosService },
      ],
    }).compile();

    service = module.get<DespachosService>(DespachosService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registrarEntregaDirecta', () => {
    const dto = {
      ordenCompraId: 1,
      requerimientoId: 2,
      proyectoId: 'uuid-proyecto',
      detalles: [{ materialId: 1, cantidad: 10 }],
    };
    const usuarioFirmaId = 'uuid-usuario';

    it('debe realizar una entrega directa exitosamente', async () => {
      const proyecto = { id: 'uuid-proyecto', bodega: { id: 5 } };
      const requerimiento = { id: 2, estado: RequirementStatus.APROBADO };
      const movimientoGuardado = { id: 'uuid-movimiento' };

      mockManager.findOne
        .mockResolvedValueOnce(proyecto)
        .mockResolvedValueOnce(requerimiento);

      mockManager.create.mockReturnValue({});
      mockManager.save.mockResolvedValue(movimientoGuardado);

      mockAuditModel.create.mockResolvedValue({});

      const resultado = await service.registrarEntregaDirecta(
        dto,
        usuarioFirmaId,
      );

      expect(resultado.movimientoId).toBe('uuid-movimiento');
      expect(resultado.message).toContain('exitosa');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockAuditModel.create).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el proyecto o su bodega no existen', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.registrarEntregaDirecta(dto, usuarioFirmaId),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el proyecto no tiene bodega', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        id: 'uuid-proyecto',
        bodega: null,
      });

      await expect(
        service.registrarEntregaDirecta(dto, usuarioFirmaId),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el requerimiento no existe', async () => {
      const proyecto = { id: 'uuid-proyecto', bodega: { id: 5 } };
      mockManager.findOne
        .mockResolvedValueOnce(proyecto)
        .mockResolvedValueOnce(null);

      await expect(
        service.registrarEntregaDirecta(dto, usuarioFirmaId),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el requerimiento no está APROBADO', async () => {
      const proyecto = { id: 'uuid-proyecto', bodega: { id: 5 } };
      const requerimiento = { id: 2, estado: RequirementStatus.PENDIENTE };
      mockManager.findOne
        .mockResolvedValueOnce(proyecto)
        .mockResolvedValueOnce(requerimiento);

      await expect(
        service.registrarEntregaDirecta(dto, usuarioFirmaId),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('debe lanzar InternalServerErrorException si ocurre un error inesperado en la transacción', async () => {
      mockManager.findOne.mockRejectedValue(new Error('Error inesperado'));

      await expect(
        service.registrarEntregaDirecta(dto, usuarioFirmaId),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
