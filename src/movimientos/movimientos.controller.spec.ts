import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { TipoMovimiento } from './entities/movimiento-inventario.entity';
import { PdfService } from '../pdf/pdf.service'; 

describe('MovimientosController', () => {
  let controller: MovimientosController;

  const mockMovimientosService = {
    registrarMovimiento: jest.fn().mockResolvedValue({ id: '1', tipo: TipoMovimiento.INGRESO }),
    findAll: jest.fn().mockResolvedValue([{ id: 'm1' }]),
    findOne: jest.fn().mockResolvedValue({ id: 'm1' }),
  };

  const adminReq = { user: { id: 'u-admin', email: 'a@t.com', rol: 'ADMIN', bodegaIds: [] } };
  const bodegueroReq = { user: { id: 'u-bod', email: 'b@t.com', rol: 'BODEGUERO', bodegaIds: [4] } };

  
  const mockPdfService = {
    generarTicketMovimientoPdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimientosController],
      providers: [
        { provide: MovimientosService, useValue: mockMovimientosService },
        { provide: PdfService, useValue: mockPdfService }, 
      ],
    }).compile();

    controller = module.get<MovimientosController>(MovimientosController);
  });

  it('debe registrar un movimiento', async () => {
    const dto = { tipo: TipoMovimiento.INGRESO as any }; 
    const mockRequest = { user: { id: 'user-123' } };
    
    expect(await controller.registrar(dto, mockRequest)).toEqual({ id: '1', tipo: TipoMovimiento.INGRESO });
    expect(mockMovimientosService.registrarMovimiento).toHaveBeenCalledWith(dto, 'user-123');
  });

  it('findAll acota los movimientos a las bodegas del BODEGUERO', async () => {
    expect(await controller.findAll(bodegueroReq)).toEqual([{ id: 'm1' }]);
    expect(mockMovimientosService.findAll).toHaveBeenCalledWith([4]);
  });

  it('findAll no acota para ADMIN', async () => {
    await controller.findAll(adminReq);
    expect(mockMovimientosService.findAll).toHaveBeenCalledWith(null);
  });

  it('GET /movimientos/:id devuelve el detalle con el alcance del usuario', async () => {
    expect(await controller.findOne('m1', bodegueroReq)).toEqual({ id: 'm1' });
    expect(mockMovimientosService.findOne).toHaveBeenCalledWith('m1', [4]);
  });
});