import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;

  const mockDashboardService = {
    obtenerKpis: jest.fn(),
    obtenerAlertasStock: jest.fn(),
    obtenerLineaTiempo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getKpis', () => {
    it('debe retornar los KPIs', async () => {
      const resultado = { proyectos: 5, requerimientos: 10 };
      mockDashboardService.obtenerKpis.mockResolvedValue(resultado);

      expect(await controller.getKpis()).toEqual(resultado);
    });
  });

  describe('getAlertasStock', () => {
    it('debe retornar alertas de stock con umbral por defecto', async () => {
      const resultado = [{ material: 'Tubo', stock: 2 }];
      mockDashboardService.obtenerAlertasStock.mockResolvedValue(resultado);

      expect(await controller.getAlertasStock()).toEqual(resultado);
      expect(mockDashboardService.obtenerAlertasStock).toHaveBeenCalledWith(10);
    });

    it('debe retornar alertas con umbral personalizado', async () => {
      await controller.getAlertasStock('5');
      expect(mockDashboardService.obtenerAlertasStock).toHaveBeenCalledWith(5);
    });
  });

  describe('getLineaTiempo', () => {
    it('debe retornar la línea de tiempo', async () => {
      const resultado = [{ accion: 'creacion', fecha: new Date() }];
      mockDashboardService.obtenerLineaTiempo.mockResolvedValue(resultado);

      expect(await controller.getLineaTiempo()).toEqual(resultado);
    });
  });
});
