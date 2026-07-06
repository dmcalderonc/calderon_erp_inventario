import { Test, TestingModule } from '@nestjs/testing';
import { InventarioService } from './inventario.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inventario } from './inventario.entity';

describe('InventarioService', () => {
  let service: InventarioService;

  const mockInventarioRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        {
          provide: getRepositoryToken(Inventario), 
          useValue: mockInventarioRepository,
        },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});