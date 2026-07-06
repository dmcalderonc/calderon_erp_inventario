import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { TipoMovimiento } from './entities/movimiento-inventario.entity';

describe('MovimientosController', () => {
  let controller: MovimientosController;

  const mockMovimientosService = {
    registrarMovimiento: jest.fn().mockResolvedValue({ id: '1', tipo: TipoMovimiento.INGRESO }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimientosController],
      providers: [{ provide: MovimientosService, useValue: mockMovimientosService }],
    }).compile();

    controller = module.get<MovimientosController>(MovimientosController);
  });

  it('debe registrar un movimiento', async () => {
    const dto = { tipo: TipoMovimiento.INGRESO };
    const mockRequest = { user: { id: 'user-123' } };
    
    expect(await controller.registrar(dto, mockRequest)).toEqual({ id: '1', tipo: TipoMovimiento.INGRESO });
    expect(mockMovimientosService.registrarMovimiento).toHaveBeenCalledWith(dto, 'user-123');
  });
});