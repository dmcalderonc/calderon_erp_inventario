import { Test, TestingModule } from '@nestjs/testing';
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
  };

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

  it('create() should call service.create', async () => {
    const dto = { materialId: 1 } as any;
    await controller.create(dto);
    expect(mockInventarioService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll() should call service.findAll', async () => {
    await controller.findAll();
    expect(mockInventarioService.findAll).toHaveBeenCalled();
  });

  it('findOne() should call service.findOne', async () => {
    await controller.findOne('1');
    expect(mockInventarioService.findOne).toHaveBeenCalledWith(1);
  });

  it('update() should call service.update', async () => {
    const dto = { cantidad_disponible: 10 } as any;
    await controller.update('1', dto);
    expect(mockInventarioService.update).toHaveBeenCalledWith(1, dto);
  });

  it('remove() should call service.remove', async () => {
    await controller.remove('1');
    expect(mockInventarioService.remove).toHaveBeenCalledWith(1);
  });
});