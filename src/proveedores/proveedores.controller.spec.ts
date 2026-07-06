import { Test, TestingModule } from '@nestjs/testing';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

describe('ProveedoresController', () => {
  let controller: ProveedoresController;

  const mockProveedoresService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProveedoresController],
      providers: [
        {
          provide: ProveedoresService,
          useValue: mockProveedoresService,
        },
      ],
    }).compile();

    controller = module.get<ProveedoresController>(ProveedoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call service.create', async () => {
    const dto = {} as any;
    await controller.create(dto);
    expect(mockProveedoresService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll() should call service.findAll', async () => {
    await controller.findAll();
    expect(mockProveedoresService.findAll).toHaveBeenCalled();
  });

  it('findOne() should call service.findOne', async () => {
    await controller.findOne('1');
    expect(mockProveedoresService.findOne).toHaveBeenCalledWith(1);
  });

  it('update() should call service.update', async () => {
    const dto = {} as any;
    await controller.update('1', dto);
    expect(mockProveedoresService.update).toHaveBeenCalledWith(1, dto);
  });

  it('remove() should call service.remove', async () => {
    await controller.remove('1');
    expect(mockProveedoresService.remove).toHaveBeenCalledWith(1);
  });
});