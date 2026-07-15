import { Test, TestingModule } from '@nestjs/testing';
import { AjustesInventarioService } from './ajustes-inventario.service';
import { DataSource } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAjusteInventarioDto } from './dto/create-ajuste-inventario.dto';

describe('AjustesInventarioService', () => {
  let service: AjustesInventarioService;
  let dataSource: DataSource;
  let auditoriaService: AuditoriaService;
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockAuditoriaService = {
    registrarAccion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AjustesInventarioService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<AjustesInventarioService>(AjustesInventarioService);
    dataSource = module.get<DataSource>(DataSource);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('ejecutarAjusteFisico', () => {
    const mockDto: CreateAjusteInventarioDto = {
      bodegaId: 1,
      motivo: 'Conteo mensual',
      detalles: [{ materialId: 10, stockFisico: 50 }],
    };
    const mockUsuarioId = 'uuid-test-123';

    it('debe procesar el ajuste correctamente y hacer commit', async () => {
      mockQueryRunner.manager.create.mockReturnValue({ id: 'ajuste-uuid' });
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'ajuste-uuid' });
      mockQueryRunner.manager.findOne.mockResolvedValue({ cantidad_disponible: 55 }); 

      const result = await service.ejecutarAjusteFisico(mockDto, mockUsuarioId);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(3); 
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockAuditoriaService.registrarAccion).toHaveBeenCalledWith(
        mockUsuarioId,
        'AJUSTE_FISICO_INVENTARIO',
        'INVENTARIO',
        expect.objectContaining({ severidad: 'CRITICAL_WARNING' })
      );

      expect(result).toEqual({
        message: 'Ajuste de inventario ejecutado correctamente.',
        ajusteId: 'ajuste-uuid',
      });
    });

    it('debe hacer rollback si ocurre un error (ej. material no existe)', async () => {
      mockQueryRunner.manager.create.mockReturnValue({ id: 'ajuste-uuid' });
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'ajuste-uuid' });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.ejecutarAjusteFisico(mockDto, mockUsuarioId))
        .rejects.toThrow(InternalServerErrorException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockAuditoriaService.registrarAccion).not.toHaveBeenCalled();
    });
  });
});