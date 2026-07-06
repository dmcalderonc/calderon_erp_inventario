import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

describe('RequirementsController', () => {
  let controller: RequirementsController;
  let service: RequirementsService;

  const mockRequirementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };


  const mockRequest = {
    user: { id: 'uuid-de-usuario-real' },
  };

  const mockRequestSinUser = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
      providers: [
        {
          provide: RequirementsService,
          useValue: mockRequirementsService,
        },
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
      const dto = { proyectoId: 1, detalles: [{ materialId: 1, cantidadSolicitada: 10 }] };
      const resultado = { id: 1, ...dto };
      mockRequirementsService.create.mockResolvedValue(resultado);

      expect(await controller.create(dto, mockRequest)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto, 'uuid-de-usuario-real');
    });

    it('debe usar el ID por defecto si el Request no trae usuario', async () => {
      const dto = { proyectoId: 1, detalles: [] };
      mockRequirementsService.create.mockResolvedValue({});

      await controller.create(dto, mockRequestSinUser);
      expect(service.create).toHaveBeenCalledWith(dto, 'uuid-de-tu-usuario-prueba');
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los requerimientos', async () => {
      const resultado = [{ id: 1, estado: 'PENDIENTE' }];
      mockRequirementsService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll()).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar un requerimiento por ID', async () => {
      const id = '1';
      const resultado = { id: 1, estado: 'PENDIENTE' };
      mockRequirementsService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar el estado usando el userId del Request', async () => {
      const id = '1';
      const dto = { estado: 'APROBADO' } as any;
      const resultado = { id: 1, estado: 'APROBADO' };
      mockRequirementsService.updateStatus.mockResolvedValue(resultado);

      expect(await controller.updateStatus(id, dto, mockRequest)).toEqual(resultado);
      expect(service.updateStatus).toHaveBeenCalledWith(1, dto, 'uuid-de-usuario-real');
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