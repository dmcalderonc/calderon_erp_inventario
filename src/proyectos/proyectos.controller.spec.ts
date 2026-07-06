import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';

describe('ProyectosController', () => {
  let controller: ProyectosController;

  const mockProyectosService = {
    create: jest.fn().mockResolvedValue({ id: '1', nombre: 'P1' }),
    findAll: jest.fn().mockResolvedValue([{ id: '1', nombre: 'P1' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1', nombre: 'P1' }),
    update: jest.fn().mockResolvedValue({ id: '1', nombre: 'P2' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProyectosController],
      providers: [{ provide: ProyectosService, useValue: mockProyectosService }],
    }).compile();

    controller = module.get<ProyectosController>(ProyectosController);
  });

  it('debe crear un proyecto', async () => {
    expect(await controller.create({ nombre: 'P1', fechaInicio: '2026-01-01' })).toEqual({ id: '1', nombre: 'P1' });
  });

  it('debe obtener todos los proyectos', async () => {
    expect(await controller.findAll()).toEqual([{ id: '1', nombre: 'P1' }]);
  });

  it('debe obtener un proyecto por id', async () => {
    expect(await controller.findOne('1')).toEqual({ id: '1', nombre: 'P1' });
  });

  it('debe actualizar un proyecto', async () => {
    expect(await controller.update('1', { nombre: 'P2' })).toEqual({ id: '1', nombre: 'P2' });
  });

  it('debe eliminar un proyecto', async () => {
    expect(await controller.remove('1')).toEqual({ deleted: true });
  });
});