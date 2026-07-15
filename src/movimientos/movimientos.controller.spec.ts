import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { TipoMovimiento } from './entities/movimiento-inventario.entity';
import { PdfService } from '../pdf/pdf.service'; 

describe('MovimientosController', () => {
  let controller: MovimientosController;

  const mockMovimientosService = {
    registrarMovimiento: jest.fn().mockResolvedValue({ id: '1', tipo: TipoMovimiento.INGRESO }),
  };

  
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
});