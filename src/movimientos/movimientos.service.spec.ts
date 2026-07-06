import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MovimientosService } from './movimientos.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Requirement } from '../requirements/entities/requirement.entity';
import { TipoMovimiento } from './entities/movimiento-inventario.entity';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

describe('MovimientosService', () => {
  let service: MovimientosService;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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

  const mockAuditoriaService = {
    registrarAccion: jest.fn(),
  };

  const mockReqRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
        { provide: getRepositoryToken(Requirement), useValue: mockReqRepository },
      ],
    }).compile();

    service = module.get<MovimientosService>(MovimientosService);
    jest.clearAllMocks();
  });

  describe('registrarMovimiento', () => {
    it('debe lanzar BadRequestException si es INGRESO y no hay bodega destino', async () => {
      const dto = { tipo: TipoMovimiento.INGRESO };
      await expect(service.registrarMovimiento(dto as any, 'user1')).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('debe registrar un movimiento de INGRESO exitosamente y auditar', async () => {
      const dto = { 
        tipo: TipoMovimiento.INGRESO, 
        bodegaDestinoId: 1,
        detalles: [{ materialId: 'mat1', cantidad: 10 }]
      };
      
      const mockSavedMovimiento = { id: 'mov1', tipo: TipoMovimiento.INGRESO };
      mockManager.create.mockReturnValueOnce(mockSavedMovimiento); // Para movimiento
      mockManager.save.mockResolvedValueOnce(mockSavedMovimiento); // Guarda movimiento
      
      mockManager.create.mockReturnValueOnce({ materialId: 'mat1', cantidad: 10 }); // Para detalle
      mockManager.save.mockResolvedValueOnce({}); // Guarda detalle
      
      mockManager.findOne.mockResolvedValueOnce({ id: 1, cantidad_disponible: 5 }); // Encuentra stock destino
      mockManager.save.mockResolvedValueOnce({}); // Actualiza stock

      const result = await service.registrarMovimiento(dto as any, 'user1');

      expect(result.id).toEqual('mov1');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockAuditoriaService.registrarAccion).toHaveBeenCalled();
    });

    it('debe hacer rollback si hay un error en la transacción', async () => {
       const dto = { tipo: TipoMovimiento.EGRESO, bodegaOrigenId: 1, detalles: [] };
       mockManager.save.mockRejectedValueOnce(new Error('Fallo DB'));

       await expect(service.registrarMovimiento(dto as any, 'user1')).rejects.toThrow(InternalServerErrorException);
       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('Requerimientos Integrados en Movimientos', () => {
    it('debe listar requerimientos (findAll)', async () => {
      mockReqRepository.find.mockResolvedValue([{ id: 1 }]);
      expect(await service.findAll()).toEqual([{ id: 1 }]);
    });
  });
});