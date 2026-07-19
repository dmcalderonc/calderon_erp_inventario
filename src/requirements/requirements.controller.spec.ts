import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';
import { ProyectoAccessGuard } from '../auth/guards/ProyectoAccessGuard';

describe('RequirementsController', () => {
  let controller: RequirementsController;
  let service: RequirementsService;

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockRequirementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'uuid-de-usuario-real', rol: 'ADMIN' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
      providers: [
        { provide: RequirementsService, useValue: mockRequirementsService },
        { provide: DataSource, useValue: mockDataSource },
        ProyectoAccessGuard,
      ],
    }).compile();

    controller = module.get<RequirementsController>(RequirementsController);
    service = module.get<RequirementsService>(RequirementsService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un requerimiento usando el userId del Request', async () => {
      const dto = {
        proyectoId: 'uuid-proyecto',
        detalles: [{ materialId: 1, cantidadSolicitada: 10 }],
      };
      const resultado = { id: 1, ...dto };
      mockRequirementsService.create.mockResolvedValue(resultado);

      expect(await controller.create(dto, mockRequest)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto, 'uuid-de-usuario-real');
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los requerimientos según rol', async () => {
      const resultado = [{ id: 1, estado: 'PENDIENTE' }];
      mockRequirementsService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll(mockRequest)).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalledWith(
        'uuid-de-usuario-real',
        'ADMIN',
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar un requerimiento por ID', async () => {
      const id = '1';
      const resultado = { id: 1, estado: 'PENDIENTE' };
      mockRequirementsService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id, mockRequest)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(
        1,
        'uuid-de-usuario-real',
        'ADMIN',
      );
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar el estado usando el userId del Request', async () => {
      const id = '1';
      const dto = { estado: 'APROBADO' } as any;
      const resultado = { id: 1, estado: 'APROBADO' };
      mockRequirementsService.updateStatus.mockResolvedValue(resultado);

      expect(await controller.updateStatus(id, dto, mockRequest)).toEqual(
        resultado,
      );
      expect(service.updateStatus).toHaveBeenCalledWith(
        1,
        dto,
        'uuid-de-usuario-real',
      );
    });
  });

  describe('remove', () => {
    it('debe eliminar un requerimiento', async () => {
      const id = '1';
      const resultado = { affected: 1 };
      mockRequirementsService.remove.mockResolvedValue(resultado);

      expect(await controller.remove(id)).toEqual(resultado);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
