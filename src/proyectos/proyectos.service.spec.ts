import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './proyecto.entity';
import { BodegasService } from '../bodegas/bodegas.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

describe('ProyectosService', () => {
  let service: ProyectosService;

  const mockManager = {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((entity, dto) => dto),
    save: jest.fn().mockImplementation((entity, dto) => Promise.resolve({ id: 'uuid-1', nombre: dto.nombre })),
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

  const mockBodegasService = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockProyectoRepository = {
    find: jest.fn().mockResolvedValue([{ id: 'uuid-1', nombre: 'Edificio A' }]),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        { provide: getRepositoryToken(Proyecto), useValue: mockProyectoRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BodegasService, useValue: mockBodegasService },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un proyecto, autogenerar codigo y crear su bodega', async () => {
      const dto = { nombre: 'Edificio A', fechaInicio: '2026-01-01' };
      
      const result = await service.create(dto as any);

      expect(mockManager.count).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
      expect(mockBodegasService.create).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.id).toBe('uuid-1');
    });

    it('debe hacer rollback si ocurre un error transaccional', async () => {
      const dto = { nombre: 'Edificio B', fechaInicio: '2026-01-01' };
      mockBodegasService.create.mockRejectedValueOnce(new Error('Fallo Bodega'));

      await expect(service.create(dto as any)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException si no existe el proyecto', async () => {
      mockProyectoRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
  });
});