import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

describe('InventarioController', () => {
  let controller: InventarioController;
  let service: InventarioService;

  const mockInventarioService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStockByBodega: jest.fn(),
    getStockByBodegas: jest.fn(),
  };

  const adminReq = { user: { id: 'u-admin', email: 'admin@t.com', rol: 'ADMIN', bodegaIds: [] } };
  const bodegueroReq = { user: { id: 'u-bod', email: 'bod@t.com', rol: 'BODEGUERO', bodegaIds: [3] } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventarioController],
      providers: [
        {
          provide: InventarioService,
          useValue: mockInventarioService,
        },
      ],
    }).compile();

    controller = module.get<InventarioController>(InventarioController);
    service = module.get<InventarioService>(InventarioService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call service.create sin acotar bodegas para ADMIN', async () => {
    const dto = { materialId: 1 } as any;
    await controller.create(dto, adminReq);
    expect(mockInventarioService.create).toHaveBeenCalledWith(dto, 'u-admin', null);
  });

  it('create() should acotar a las bodegas asignadas para BODEGUERO', async () => {
    const dto = { bodega_id: 3 } as any;
    await controller.create(dto, bodegueroReq);
    expect(mockInventarioService.create).toHaveBeenCalledWith(dto, 'u-bod', [3]);
  });

  it('findAll() should call service.findAll sin filtro para ADMIN', async () => {
    await controller.findAll(adminReq);
    expect(mockInventarioService.findAll).toHaveBeenCalledWith(null);
  });

  it('findAll() should filtrar por las bodegas del BODEGUERO', async () => {
    await controller.findAll(bodegueroReq);
    expect(mockInventarioService.findAll).toHaveBeenCalledWith([3]);
  });

  it('findOne() should call service.findOne', async () => {
    await controller.findOne('1', adminReq);
    expect(mockInventarioService.findOne).toHaveBeenCalledWith(1, null);
  });

  it('update() should call service.update', async () => {
    const dto = { cantidad_disponible: 10 } as any;
    await controller.update('1', dto, adminReq);
    expect(mockInventarioService.update).toHaveBeenCalledWith(1, dto, null);
  });

  it('getByBodega() impide al BODEGUERO consultar una bodega ajena', async () => {
    mockInventarioService.getStockByBodega.mockImplementation((_id: number, visibles: number[] | null) => {
      if (visibles !== null && !visibles.includes(_id)) {
        throw new ForbiddenException('No tiene permisos para consultar esta bodega');
      }
      return [];
    });

    await expect(controller.getByBodega(99, bodegueroReq)).rejects.toThrow(ForbiddenException);
    expect(mockInventarioService.getStockByBodega).toHaveBeenCalledWith(99, [3]);

    await expect(controller.getByBodega(3, bodegueroReq)).resolves.toEqual([]);
  });

  it('remove() should call service.remove', async () => {
    await controller.remove('1');
    expect(mockInventarioService.remove).toHaveBeenCalledWith(1);
  });
});