import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

describe('CategoriasController', () => {
  let controller: CategoriasController;
  let service: CategoriasService;


  const mockCategoriasService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [
        {
          provide: CategoriasService,
          useValue: mockCategoriasService,
        },
      ],
    }).compile();

    controller = module.get<CategoriasController>(CategoriasController);
    service = module.get<CategoriasService>(CategoriasService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una categoría', async () => {
      const dto = { nombre: 'Químicos', prefijo: 'QUI' };
      const resultado = { id: 1, ...dto };
      mockCategoriasService.create.mockResolvedValue(resultado);

      expect(await controller.create(dto)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de categorías', async () => {
      const resultado = [{ id: 1, nombre: 'Químicos', prefijo: 'QUI' }];
      mockCategoriasService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll()).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar una categoría por ID', async () => {
      const id = '1';
      const resultado = { id: 1, nombre: 'Químicos', prefijo: 'QUI' };
      mockCategoriasService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(+id);
    });
  });

  describe('update', () => {
    it('debe actualizar una categoría', async () => {
      const id = '1';
      const dto = { nombre: 'Químicos Actualizados' };
      const resultado = { id: 1, nombre: 'Químicos Actualizados', prefijo: 'QUI' };
      mockCategoriasService.update.mockResolvedValue(resultado);

      expect(await controller.update(id, dto)).toEqual(resultado);
      expect(service.update).toHaveBeenCalledWith(+id, dto);
    });
  });

  describe('remove', () => {
    it('debe eliminar una categoría', async () => {
      const id = '1';
      const resultado = { message: 'La categoría "Químicos" fue eliminada correctamente.' };
      mockCategoriasService.remove.mockResolvedValue(resultado);

      expect(await controller.remove(id)).toEqual(resultado);
      expect(service.remove).toHaveBeenCalledWith(+id);
    });
  });
});