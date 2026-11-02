import { Test, TestingModule } from '@nestjs/testing';
import { PrevisionController } from './prevision.controller';
import { PrevisionService } from './prevision.service';
import { PrediccionQueryDto } from './dto/prediccion-query.dto';

describe('PrevisionController', () => {
  let controller: PrevisionController;

  const mockPrevisionService = {
    obtenerPrediccion: jest.fn().mockResolvedValue({ materiales: [] }),
    generarAlertas: jest.fn().mockResolvedValue({ alertasGeneradas: 0 }),
  };

  const adminReq = { user: { id: 'u-admin', email: 'a@t.com', rol: 'ADMIN', bodegaIds: [] } };
  const bodegueroReq = { user: { id: 'u-bod', email: 'b@t.com', rol: 'BODEGUERO', bodegaIds: [2, 5] } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrevisionController],
      providers: [
        { provide: PrevisionService, useValue: mockPrevisionService },
      ],
    }).compile();

    controller = module.get<PrevisionController>(PrevisionController);
  });

  describe('obtenerPrediccion', () => {
    it('aplica los valores por defecto (dias=30, umbrales 7 y 15)', async () => {
      await controller.obtenerPrediccion(new PrediccionQueryDto(), adminReq);

      expect(mockPrevisionService.obtenerPrediccion).toHaveBeenCalledWith(
        expect.objectContaining({ dias: 30, umbralCritico: 7, umbralRiesgo: 15, limite: 100, soloAlertas: false }),
        { id: 'u-admin', rol: 'ADMIN', bodegaIds: [] },
      );
    });

    it('hace passthrough de los parámetros y del alcance del usuario', async () => {
      const query = new PrediccionQueryDto();
      query.dias = 60;
      query.umbralCritico = 5;
      query.soloAlertas = true;
      query.bodegaId = 2;

      await controller.obtenerPrediccion(query, bodegueroReq);

      expect(mockPrevisionService.obtenerPrediccion).toHaveBeenCalledWith(query, {
        id: 'u-bod',
        rol: 'BODEGUERO',
        bodegaIds: [2, 5],
      });
    });
  });

  describe('generarAlertas', () => {
    it('usa el alcance global por defecto', async () => {
      await controller.generarAlertas({}, adminReq);

      expect(mockPrevisionService.generarAlertas).toHaveBeenCalledWith(
        expect.objectContaining({ dias: 30, bodegaId: undefined }),
        { id: 'u-admin', rol: 'ADMIN', bodegaIds: [] },
      );
    });

    it('acota a la bodega del body si se envía', async () => {
      await controller.generarAlertas({ bodegaId: 3 }, adminReq);

      expect(mockPrevisionService.generarAlertas).toHaveBeenCalledWith(
        expect.objectContaining({ bodegaId: 3 }),
        expect.anything(),
      );
    });

    it('tolera un body vacío', async () => {
      await controller.generarAlertas(undefined as any, adminReq);

      expect(mockPrevisionService.generarAlertas).toHaveBeenCalled();
    });
  });
});
