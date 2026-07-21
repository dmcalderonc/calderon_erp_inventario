import { Test, TestingModule } from '@nestjs/testing';
import { MaterialesController } from './materiales.controller';
import { MaterialesService } from './materiales.service';

describe('MaterialesController', () => {
  let controller: MaterialesController;
  let service: MaterialesService;

  const mockMaterialesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: { id: 99 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialesController],
      providers: [
        {
          provide: MaterialesService,
          useValue: mockMaterialesService,
        },
      ],
    }).compile();

    controller = module.get<MaterialesController>(MaterialesController);
    service = module.get<MaterialesService>(MaterialesService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un material pasando el usuarioId', async () => {
      const dto = { nombre: 'Tubo de Ensayo', descripcion: 'Vidrio', unidad_medida_id: 1, categoria_id: 1 };
      const resultado = { id: 1, sku: 'VID-0001', ...dto };
      mockMaterialesService.create.mockResolvedValue(resultado);

      expect(await controller.create(dto, mockRequest)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto, 99);
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de materiales', async () => {
      const resultado = [{ id: 1, nombre: 'Tubo de Ensayo', sku: 'VID-0001' }];
      mockMaterialesService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll()).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar un material por ID', async () => {
      const id = '1';
      const resultado = { id: 1, nombre: 'Tubo de Ensayo', sku: 'VID-0001' };
      mockMaterialesService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('debe actualizar un material pasando el usuarioId', async () => {
      const id = '1';
      const dto = { nombre: 'Tubo de Ensayo 10ml' };
      const resultado = { id: 1, nombre: 'Tubo de Ensayo 10ml', sku: 'VID-0001' };
      mockMaterialesService.update.mockResolvedValue(resultado);

      expect(await controller.update(id, dto, mockRequest)).toEqual(resultado);
      expect(service.update).toHaveBeenCalledWith(1, dto, 99);
    });
  });

  describe('remove', () => {
    it('debe eliminar un material pasando el usuarioId', async () => {
      const id = '1';
      const resultado = { message: 'El material con SKU VID-0001 ha sido eliminado.' };
      mockMaterialesService.remove.mockResolvedValue(resultado);

      expect(await controller.remove(id, mockRequest)).toEqual(resultado);
      expect(service.remove).toHaveBeenCalledWith(1, 99);
    });
  });
});
