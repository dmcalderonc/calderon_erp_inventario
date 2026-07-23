import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SolicitudesCompraController } from './solicitudes-compra.controller';
import { SolicitudesCompraService } from './solicitudes-compra.service';
import { ProyectoAccessGuard } from '../auth/guards/ProyectoAccessGuard';

describe('SolicitudesCompraController', () => {
  let controller: SolicitudesCompraController;
  let service: SolicitudesCompraService;

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockSolicitudesService = {
    findAll: jest.fn(),
    update: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'uuid-usuario', rol: 'ADMIN' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitudesCompraController],
      providers: [
        { provide: SolicitudesCompraService, useValue: mockSolicitudesService },
        { provide: DataSource, useValue: mockDataSource },
        ProyectoAccessGuard,
      ],
    }).compile();

    controller = module.get<SolicitudesCompraController>(
      SolicitudesCompraController,
    );
    service = module.get<SolicitudesCompraService>(SolicitudesCompraService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar todas las solicitudes de compra con filtros opcionales', async () => {
      const resultado = [{ id: 1, estado: 'PENDIENTE' }];
      mockSolicitudesService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll()).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('debe filtrar por estado y proyectoId', async () => {
      const resultado = [{ id: 1, estado: 'APROBADA' }];
      mockSolicitudesService.findAll.mockResolvedValue(resultado);

      expect(
        await controller.findAll('APROBADA' as any, 'uuid-proyecto'),
      ).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalledWith('APROBADA', 'uuid-proyecto');
    });
  });

  describe('update', () => {
    it('debe actualizar una solicitud usando userId y rol del Request', async () => {
      const id = '1';
      const dto = { estado: 'APROBADA' };
      const resultado = { id: 1, estado: 'APROBADA' };
      mockSolicitudesService.update.mockResolvedValue(resultado);

      expect(await controller.update(id, dto, mockRequest)).toEqual(resultado);
      expect(service.update).toHaveBeenCalledWith(
        1,
        dto,
        'uuid-usuario',
        'ADMIN',
      );
    });
  });
});
