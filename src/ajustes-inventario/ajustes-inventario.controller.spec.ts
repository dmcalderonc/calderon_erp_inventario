import { Test, TestingModule } from '@nestjs/testing';
import { AjustesInventarioController } from './ajustes-inventario.controller';
import { AjustesInventarioService } from './ajustes-inventario.service';
import { CreateAjusteInventarioDto } from './dto/create-ajustes-inventario.dto';

describe('AjustesInventarioController', () => {
  let controller: AjustesInventarioController;
  let service: AjustesInventarioService;

  const mockAjustesInventarioService = {
    ejecutarAjusteFisico: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AjustesInventarioController],
      providers: [
        {
          provide: AjustesInventarioService,
          useValue: mockAjustesInventarioService,
        },
      ],
    }).compile();

    controller = module.get<AjustesInventarioController>(
      AjustesInventarioController,
    );
    service = module.get<AjustesInventarioService>(AjustesInventarioService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('ejecutarAjuste', () => {
    it('debe llamar al servicio con el DTO y el ID del usuario', async () => {
      const mockDto: CreateAjusteInventarioDto = {
        bodegaId: 1,
        motivo: 'Ajuste por merma',
        detalles: [{ materialId: 2, stockFisico: 100 }],
      };

      const mockReq = {
        user: { id: 'uuid-1234' },
      };

      const mockResponse = {
        message: 'Ajuste de inventario ejecutado correctamente.',
        ajusteId: 'uuid-ajuste',
      };
      mockAjustesInventarioService.ejecutarAjusteFisico.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.ejecutarAjuste(mockDto, mockReq);

      expect(service.ejecutarAjusteFisico).toHaveBeenCalledWith(
        mockDto,
        mockReq.user.id,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
