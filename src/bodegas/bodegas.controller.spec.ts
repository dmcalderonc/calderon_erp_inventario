import { Test, TestingModule } from '@nestjs/testing';
import { BodegasController } from './bodegas.controller';
import { BodegasService } from './bodegas.service';

describe('BodegasController', () => {
  let controller: BodegasController;

  const mockBodegasService = {
    create: jest.fn().mockResolvedValue({ id: 1, nombre: 'Bodega Test' }),
    findAll: jest.fn().mockResolvedValue([{ id: 1, nombre: 'Bodega Test' }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, nombre: 'Bodega Test' }),
    update: jest.fn().mockResolvedValue({ id: 1, nombre: 'Bodega Act' }),
    remove: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BodegasController],
      providers: [{ provide: BodegasService, useValue: mockBodegasService }],
    }).compile();

    controller = module.get<BodegasController>(BodegasController);
  });

  it('debe crear una bodega', async () => {
    expect(await controller.create({ nombre: 'Bodega Test', ubicacion: 'X' })).toEqual({ id: 1, nombre: 'Bodega Test' });
  });

  it('debe obtener todas las bodegas', async () => {
    expect(await controller.findAll()).toEqual([{ id: 1, nombre: 'Bodega Test' }]);
  });

  it('debe obtener una bodega', async () => {
    expect(await controller.findOne(1)).toEqual({ id: 1, nombre: 'Bodega Test' });
  });

  it('debe actualizar una bodega', async () => {
    expect(await controller.update(1, { nombre: 'Bodega Act' })).toEqual({ id: 1, nombre: 'Bodega Act' });
  });

  it('debe eliminar una bodega', async () => {
    expect(await controller.remove(1)).toEqual({ id: 1 });
  });
});