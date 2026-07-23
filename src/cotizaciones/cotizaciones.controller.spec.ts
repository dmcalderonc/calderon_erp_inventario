import { Test, TestingModule } from '@nestjs/testing';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';

describe('CotizacionesController', () => {
  let controller: CotizacionesController;
  let service: CotizacionesService;

  const mockCotizacionesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CotizacionesController],
      providers: [
        {
          provide: CotizacionesService,
          useValue: mockCotizacionesService,
        },
      ],
    }).compile();

    controller = module.get<CotizacionesController>(CotizacionesController);
    service = module.get<CotizacionesService>(CotizacionesService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una cotización', async () => {
      const dto = { solicitudId: 1, proveedorId: 1, precioOfertadoTotal: 100 };
      const resultado = { id: 1, ...dto };
      mockCotizacionesService.create.mockResolvedValue(resultado);
      const req = { user: { id: 'uuid-1' } };

      expect(await controller.create(dto, req)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto, 'uuid-1');
    });
  });

  describe('findAll', () => {
    it('debe retornar todas las cotizaciones', async () => {
      const resultado = [{ id: 1, precioOfertadoTotal: 100 }];
      mockCotizacionesService.findAll.mockResolvedValue(resultado);
      const req = { user: { id: 'uuid-1', rol: 'ADMIN' } };

      expect(await controller.findAll(req)).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalledWith('uuid-1', 'ADMIN');
    });
  });

  describe('findOne', () => {
    it('debe retornar una cotización por ID', async () => {
      const id = '1';
      const resultado = { id: 1, precioOfertadoTotal: 100 };
      mockCotizacionesService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('debe actualizar una cotización', async () => {
      const id = '1';
      const dto = { precioOfertadoTotal: 150 };
      const resultado = { id: 1, ...dto };
      mockCotizacionesService.update.mockResolvedValue(resultado);

      expect(await controller.update(id, dto)).toEqual(resultado);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('debe eliminar una cotización', async () => {
      const id = '1';
      const resultado = { affected: 1 };
      mockCotizacionesService.remove.mockResolvedValue(resultado);

      expect(await controller.remove(id)).toEqual(resultado);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
