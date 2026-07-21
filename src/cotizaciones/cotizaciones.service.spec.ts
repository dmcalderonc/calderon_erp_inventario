import { Test, TestingModule } from '@nestjs/testing';
import { CotizacionesService } from './cotizaciones.service';

describe('CotizacionesService', () => {
  let service: CotizacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CotizacionesService],
    }).compile();

    service = module.get<CotizacionesService>(CotizacionesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una cotización', () => {
      const dto = { solicitudId: 1, proveedorId: 1, precioOfertadoTotal: 100 };
      const resultado = service.create(dto);
      expect(resultado).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('debe retornar todas las cotizaciones', () => {
      const resultado = service.findAll();
      expect(resultado).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('debe retornar una cotización por ID', () => {
      const resultado = service.findOne(1);
      expect(resultado).toBeDefined();
    });
  });

  describe('update', () => {
    it('debe actualizar una cotización', () => {
      const resultado = service.update(1, { precioOfertadoTotal: 150 });
      expect(resultado).toBeDefined();
    });
  });

  describe('remove', () => {
    it('debe eliminar una cotización', () => {
      const resultado = service.remove(1);
      expect(resultado).toBeDefined();
    });
  });
});
