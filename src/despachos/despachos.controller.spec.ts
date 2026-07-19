import { Test, TestingModule } from '@nestjs/testing';
import { DespachosController } from './despachos.controller';
import { DespachosService } from './despachos.service';

describe('DespachosController', () => {
  let controller: DespachosController;
  let service: DespachosService;

  const mockDespachosService = {
    registrarEntregaDirecta: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'uuid-usuario', rol: 'BODEGUERO' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DespachosController],
      providers: [
        {
          provide: DespachosService,
          useValue: mockDespachosService,
        },
      ],
    }).compile();

    controller = module.get<DespachosController>(DespachosController);
    service = module.get<DespachosService>(DespachosService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('entregaDirecta', () => {
    it('debe registrar una entrega directa usando el usuario del Request', async () => {
      const dto = {
        ordenCompraId: 1,
        requerimientoId: 2,
        proyectoId: 'uuid-proyecto',
        detalles: [{ materialId: 1, cantidad: 10 }],
      };
      const resultado = {
        statusCode: 201,
        message: 'Entrega directa procesada exitosamente con doble afectación.',
        movimientoId: 'uuid-movimiento',
      };
      mockDespachosService.registrarEntregaDirecta.mockResolvedValue(resultado);

      expect(await controller.entregaDirecta(dto, mockRequest)).toEqual(
        resultado,
      );
      expect(service.registrarEntregaDirecta).toHaveBeenCalledWith(
        dto,
        'uuid-usuario',
      );
    });
  });
});
