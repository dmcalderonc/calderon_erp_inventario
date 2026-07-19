import { Test, TestingModule } from '@nestjs/testing';
import { ComprasService } from './compras.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { Cotizacion } from '../cotizaciones/entities/cotizacion.entity';
import { MovimientosService } from '../movimientos/movimientos.service';

describe('ComprasService', () => {
  let service: ComprasService;

  const mockOrdenCompraRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockMovimientosService = {
    dispararMovimiento: jest.fn(),
  };

  const mockAuditLogModel = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasService,
        {
          provide: getRepositoryToken(OrdenCompra),
          useValue: mockOrdenCompraRepository,
        },
        {
          provide: MovimientosService,
          useValue: mockMovimientosService,
        },
        {
          provide: getRepositoryToken(Cotizacion),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: 'AuditLogModel',
          useValue: mockAuditLogModel,
        },
      ],
    }).compile();

    service = module.get<ComprasService>(ComprasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe llamar a find de repositorio', async () => {
    mockOrdenCompraRepository.find.mockResolvedValue([]);
    await service.findAll();
    expect(mockOrdenCompraRepository.find).toHaveBeenCalled();
  });
});
