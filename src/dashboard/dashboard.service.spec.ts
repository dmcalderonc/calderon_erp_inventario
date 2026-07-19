import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Requirement } from '../requirements/entities/requirement.entity';
import { Inventario } from '../inventario/inventario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockProyectoRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockRequirementRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockInventarioRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditoriaService = {
    obtenerLineaTiempo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Proyecto),
          useValue: mockProyectoRepository,
        },
        {
          provide: getRepositoryToken(Requirement),
          useValue: mockRequirementRepository,
        },
        {
          provide: getRepositoryToken(Inventario),
          useValue: mockInventarioRepository,
        },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
