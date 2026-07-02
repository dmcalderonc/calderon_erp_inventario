import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosService } from './proyectos.service';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Proyecto } from './proyecto.entity';
import { BodegasService } from '../bodegas/bodegas.service';

describe('ProyectosService', () => {
  let service: ProyectosService;
  let dataSource: any;
  let bodegasService: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((entity, dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 'uuid-1234', nombre: 'Proyecto Test' }),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockBodegasService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        { provide: getRepositoryToken(Proyecto), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BodegasService, useValue: mockBodegasService },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
    dataSource = module.get<DataSource>(DataSource);
    bodegasService = module.get<BodegasService>(BodegasService);
  });

  it('debería autogenerar el código de proyecto y llamar a BodegasService dentro de la transacción', async () => {
    const dto = { nombre: 'Proyecto Alfa', fechaInicio: '2026-06-28' };
    const result = await service.create(dto);

    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.manager.count).toHaveBeenCalledWith(Proyecto);
    expect(bodegasService.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Bodega Obra: Proyecto Test', proyectoId: 'uuid-1234' }),
      mockQueryRunner.manager,
    );
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
  });
});