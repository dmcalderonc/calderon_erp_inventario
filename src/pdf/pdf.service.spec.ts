import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);


    jest.spyOn(service as any, 'getPrinter').mockResolvedValue({
      createPdfKitDocument: () => {
        return {
          on: (evento: string, callback: any) => {
            if (evento === 'data') callback(Buffer.from('pdf-simulado-para-el-test'));
            if (evento === 'end') callback();
          },
          end: () => {},
        };
      },
    });
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generarOrdenCompraPdf', () => {
    it('debería generar un buffer de PDF para una orden con datos completos', async () => {
      const mockOrden = {
        fechaEmision: new Date().toISOString(),
        codigo: 'ORD-TEST-001',
        estado: 'APROBADA',
        proveedor: {
          razon_social: 'Proveedor de Pruebas S.A.',
          ruc: '1790000000001',
          email: 'contacto@pruebas.com',
          direccion: 'Av. Siempre Viva 123',
        },
        detalles: [
          { id: 'MAT-01', cantidad: 10, precioUnitario: 15.5 },
          { id: 'MAT-02', cantidad: 5, precioUnitario: 100.0 },
        ],
        subtotal: 655,
        impuestos: 78.6,
        total: 733.6,
      };

      const result = await service.generarOrdenCompraPdf(mockOrden);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('debería generar el PDF incluso si faltan datos opcionales (fallbacks)', async () => {
      const mockOrdenIncompleta = {};

      const result = await service.generarOrdenCompraPdf(mockOrdenIncompleta);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generarTicketMovimientoPdf', () => {
    it('debería generar un buffer de PDF para un movimiento de inventario', async () => {
      const mockMovimiento = {
        fecha: new Date().toISOString(),
        tipo: 'TRANSFERENCIA',
        bodegaOrigen: { nombre: 'Bodega Principal' },
        bodegaDestino: { nombre: 'Bodega Secundaria' },
      };

      const result = await service.generarTicketMovimientoPdf(mockMovimiento);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});