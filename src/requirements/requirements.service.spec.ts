import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from './requirements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Requirement, RequirementStatus } from './entities/requirement.entity';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('RequirementsService', () => {
  let service: RequirementsService;

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

  const mockRequirementRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        {
          provide: getRepositoryToken(Requirement),
          useValue: mockRequirementRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un requerimiento exitosamente', async () => {
      const dto = {
        proyectoId: 'uuid-proyecto',
        detalles: [{ materialId: 2, cantidadSolicitada: 5 }],
      };
      const userId = 'user-1';

      const mappedEntity = {
        proyectoId: 'uuid-proyecto',
        estado: RequirementStatus.PENDIENTE,
        detalles: [{ materialId: 2, cantidadSolicitada: 5 }],
      };
      const savedEntity = { id: 1, ...mappedEntity };

      mockRequirementRepository.create.mockReturnValue(mappedEntity);
      mockRequirementRepository.save.mockResolvedValue(savedEntity);

      const resultado = await service.create(dto, userId);

      expect(resultado).toEqual(savedEntity);
      expect(mockRequirementRepository.create).toHaveBeenCalled();
      expect(mockRequirementRepository.save).toHaveBeenCalledWith(mappedEntity);
    });

    it('debe lanzar InternalServerErrorException si falla la base de datos', async () => {
      const dto = { proyectoId: 'uuid-proyecto', detalles: [] };
      mockRequirementRepository.create.mockReturnValue({});
      mockRequirementRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateStatus (Transacciones)', () => {
    it('debe lanzar NotFoundException si no existe el requerimiento', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          1,
          { estado: RequirementStatus.APROBADO },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    describe('Transición: PENDIENTE -> APROBADO', () => {
      it('debe reservar stock correctamente si hay suficiente cantidad', async () => {
        const reqExistente = {
          id: 1,
          estado: RequirementStatus.PENDIENTE,
          detalles: [{ materialId: 2, cantidadSolicitada: 5 }],
          proyecto: { bodega: { id: 2 } },
        };
        const stockExistente = {
          cantidad_disponible: 10,
          cantidad_reservada: 0,
        };

        mockManager.findOne
          .mockResolvedValueOnce(reqExistente)
          .mockResolvedValueOnce(stockExistente);

        mockManager.save.mockResolvedValue({});

        await service.updateStatus(
          1,
          { estado: RequirementStatus.APROBADO },
          'user-1',
        );

        expect(mockManager.save).toHaveBeenCalledWith(
          expect.objectContaining({
            cantidad_disponible: 5,
            cantidad_reservada: 5,
          }),
        );
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });

      it('debe hacer rollback y lanzar BadRequestException si no hay stock suficiente', async () => {
        const reqExistente = {
          id: 1,
          estado: RequirementStatus.PENDIENTE,
          detalles: [{ materialId: 2, cantidadSolicitada: 15 }],
        };
        const stockInsuficiente = {
          cantidad_disponible: 10,
          cantidad_reservada: 0,
        };

        mockManager.findOne
          .mockResolvedValueOnce(reqExistente)
          .mockResolvedValueOnce(stockInsuficiente);

        await expect(
          service.updateStatus(
            1,
            { estado: RequirementStatus.APROBADO },
            'user-1',
          ),
        ).rejects.toThrow(BadRequestException);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      });
    });

    describe('Transición: APROBADO -> ATENDIDO', () => {
      it('debe generar movimientos y liberar el stock reservado', async () => {
        const reqExistente = {
          id: 1,
          estado: RequirementStatus.APROBADO,
          detalles: [{ materialId: 2, cantidadSolicitada: 5 }],
          proyecto: { bodega: { id: 2 } },
        };
        const stockReservado = {
          cantidad_disponible: 5,
          cantidad_reservada: 5,
        };
        const movimientoGenerado = { id: 99 };

        mockManager.findOne
          .mockResolvedValueOnce(reqExistente)
          .mockResolvedValueOnce(stockReservado);

        mockManager.create.mockReturnValue({});
        mockManager.save.mockResolvedValueOnce(movimientoGenerado);

        await service.updateStatus(
          1,
          { estado: RequirementStatus.ATENDIDO },
          'user-1',
        );

        expect(mockManager.save).toHaveBeenCalledWith(
          expect.objectContaining({
            cantidad_reservada: 0,
          }),
        );

        expect(mockManager.save).toHaveBeenCalledWith(
          expect.objectContaining({
            estado: RequirementStatus.ATENDIDO,
          }),
        );

        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      });
    });
  });

  describe('findAll', () => {
    it('debe retornar la lista de requerimientos', async () => {
      const data = [{ id: 1, estado: 'PENDIENTE' }];
      mockRequirementRepository.find.mockResolvedValue(data);
      expect(await service.findAll()).toEqual(data);
    });
  });

  describe('findOne', () => {
    it('debe retornar un requerimiento por su id', async () => {
      const data = { id: 1, estado: 'PENDIENTE' };
      mockRequirementRepository.findOne.mockResolvedValue(data);
      expect(await service.findOne(1)).toEqual(data);
    });
  });

  describe('remove', () => {
    it('debe borrar un requerimiento', async () => {
      mockRequirementRepository.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove(1)).toEqual({ affected: 1 });
      expect(mockRequirementRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
