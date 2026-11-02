import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrevisionService } from './prevision.service';
import { MovimientoInventario } from '../movimientos/entities/movimiento-inventario.entity';
import { Inventario } from '../inventario/inventario.entity';
import { Material } from '../materiales/material.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrediccionQueryDto } from './dto/prediccion-query.dto';

const haceDias = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

/** 22 salidas diarias dentro de la ventana de 30 días. */
const movimientosCemento = Array.from({ length: 22 }, (_, i) => ({
  materialId: 1,
  fecha: haceDias(i + 1),
  cantidad: 1,
  tipo: 'EGRESO',
  bodegaOrigenId: null,
  bodegaDestinoId: null,
}));

const materiales = [
  { materialId: 1, nombre: 'Cemento Portland 50kg', sku: 'CEM-050', unidad: 'UND', categoria: 'Materiales' },
  { materialId: 2, nombre: 'Clavo 2 pulg', sku: 'CLA-002', unidad: 'KG', categoria: 'Fijaciones' },
  { materialId: 3, nombre: 'Pintura blanca', sku: 'PIN-100', unidad: 'LT', categoria: 'Acabados' },
  { materialId: 4, nombre: 'Varilla corrugada', sku: 'VAR-010', unidad: 'UND', categoria: 'Estructura' },
];

const dtoBase = () => new PrediccionQueryDto();

describe('PrevisionService', () => {
  let service: PrevisionService;

  const movRepo = { query: jest.fn() };
  const inventarioRepo = { query: jest.fn() };
  const materialRepo = { query: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  const auditoriaService = { registrarAccion: jest.fn() };
  const notificationsService = { existeNoLeidaReciente: jest.fn() };

  /**
   * Escenario global: Cemento en dos bodegas (3 + 1 und.), Pintura en Central,
   * Varilla en Norte y Clavo sin stock.
   */
  const stockDefault = [
    { materialId: 1, bodegaId: 1, bodegaNombre: 'Central', disponible: 3, reservada: 0 },
    { materialId: 1, bodegaId: 2, bodegaNombre: 'Norte', disponible: 1, reservada: 0 },
    { materialId: 3, bodegaId: 1, bodegaNombre: 'Central', disponible: 50, reservada: 0 },
    { materialId: 4, bodegaId: 2, bodegaNombre: 'Norte', disponible: 10, reservada: 0 },
  ];

  const preparar = (movimientos: any[] = movimientosCemento, stock: any[] = stockDefault) => {
    movRepo.query.mockResolvedValue(movimientos);
    inventarioRepo.query.mockResolvedValue(stock);
    materialRepo.query.mockResolvedValue(materiales);
    notificationsService.existeNoLeidaReciente.mockResolvedValue(false);
    auditoriaService.registrarAccion.mockResolvedValue(undefined);
  };

  const admin = { id: 'u-admin', rol: 'ADMIN', bodegaIds: [] };
  const bodeguero = { id: 'u-bod', rol: 'BODEGUERO', bodegaIds: [1] };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrevisionService,
        { provide: getRepositoryToken(MovimientoInventario), useValue: movRepo },
        { provide: getRepositoryToken(Inventario), useValue: inventarioRepo },
        { provide: getRepositoryToken(Material), useValue: materialRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditoriaService, useValue: auditoriaService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<PrevisionService>(PrevisionService);
    preparar();
  });

  describe('obtenerPrediccion — alcance y seguridad', () => {
    test('el ADMIN obtiene alcance global con todos los materiales', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);

      expect(resultado.alcance).toEqual({ bodegaId: null, nivel: 'GLOBAL' });
      expect(resultado.materiales).toHaveLength(4);
    });

    test('un BODEGUERO solo ve materiales de SUS bodegas', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), bodeguero);

      const cemento = resultado.materiales.find(m => m.materialId === 1);
      // Solo el stock de la bodega 1 (3 und.), jamás el de la bodega 2.
      expect(cemento?.stockActual).toBe(3);
      expect(cemento?.bodegaId).toBe(1);
      expect(cemento?.bodegaNombre).toBe('Central');

      // La Varilla solo existe en la bodega 2: no debe aparecerle.
      expect(resultado.materiales.some(m => m.materialId === 4)).toBe(false);
      expect(resultado.materiales.map(m => m.materialId)).toEqual([1, 3]);
    });

    test('un BODEGUERO pidiendo una bodega ajena recibe Forbidden', async () => {
      await expect(
        service.obtenerPrediccion({ ...dtoBase(), bodegaId: 2 }, bodeguero),
      ).rejects.toThrow(ForbiddenException);
    });

    test('un BODEGUERO con bodegas asignadas recibe lista vacía y 200 (caso B6)', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), { id: 'u', rol: 'BODEGUERO', bodegaIds: [] });

      expect(resultado.materiales).toEqual([]);
      expect(resultado.resumen.totalMateriales).toBe(0);
    });

    test('un COMPRADOR tiene alcance global', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), { id: 'u', rol: 'COMPRADOR', bodegaIds: [] });

      expect(resultado.alcance).toEqual({ bodegaId: null, nivel: 'GLOBAL' });
      expect(resultado.materiales).toHaveLength(4);
    });
  });

  describe('obtenerPrediccion — cálculo y resumen', () => {
    test('clasifica los casos borde B1 (sin historial) y B3 (sin stock)', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);

      expect(resultado.materiales.map(m => [m.materialId, m.nivel])).toEqual([
        [2, 'AGOTADO'],   // sin stock y sin movimientos
        [1, 'CRITICO'],   // 4 und. efectivas / 0.7333 und.-día = 6 días
        [4, 'SIN_DATOS'], // sin salidas (desempate por menor stock)
        [3, 'SIN_DATOS'], // sin salidas
      ]);
    });

    test('la lista sale ordenada por urgencia', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);

      expect(resultado.materiales.map(m => m.nivel)).toEqual([
        'AGOTADO', 'CRITICO', 'SIN_DATOS', 'SIN_DATOS',
      ]);
    });

    test('el resumen cuadra con la lista evaluada', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);

      expect(resultado.resumen).toEqual({
        totalMateriales: 4,
        agotados: 1,
        criticos: 1,
        riesgo: 0,
        estables: 0,
        sinDatos: 2,
        anomalias: 0,
        criticosSinCobertura: 0,
      });
    });

    test('calcula el consumo promedio y los días hasta agotar', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);
      const cemento = resultado.materiales.find(m => m.materialId === 1)!;

      expect(cemento.consumoPromedio).toBe(0.7333);       // 22 salidas / 30 días
      expect(cemento.diasHastaAgotar).toBe(6);            // ceil(4 / 0.7333)
      expect(cemento.salidasEnVentana).toBe(22);
      expect(cemento.serieSemanal).toHaveLength(4);
    });

    test('no inventa días de agotamiento sin consumo (caso B2)', async () => {
      const resultado = await service.obtenerPrediccion(dtoBase(), admin);
      const sinMovimientos = resultado.materiales.find(m => m.materialId === 3)!;

      expect(sinMovimientos.consumoPromedio).toBe(0);
      expect(sinMovimientos.diasHastaAgotar).toBeNull();
    });

    test('un stock negativo (dato sucio) se degrada a AGOTADO, nunca a NaN', async () => {
      preparar([], [
        { materialId: 1, bodegaId: 1, bodegaNombre: 'Central', disponible: -5, reservada: 0 },
      ]);
      materialRepo.query.mockResolvedValue([materiales[0]]);

      const resultado = await service.obtenerPrediccion(dtoBase(), admin);

      expect(resultado.materiales[0]).toMatchObject({ nivel: 'AGOTADO', stockEfectivo: -5, diasHastaAgotar: null });
    });

    test('las transferencias no consumen stock global pero sí el de la bodega de origen (D6)', async () => {
      const transferencia = [{
        materialId: 1,
        fecha: haceDias(1),
        cantidad: 10,
        tipo: 'TRANSFERENCIA',
        bodegaOrigenId: 1,
        bodegaDestinoId: 2,
      }];

      materialRepo.query.mockResolvedValue([materiales[0]]);
      movRepo.query.mockResolvedValue(transferencia);

      const global = await service.obtenerPrediccion(
        { ...dtoBase(), dias: 7 },
        admin,
      );
      expect(global.materiales.find(m => m.materialId === 1)?.salidasEnVentana).toBe(0);

      const porBodega = await service.obtenerPrediccion(
        { ...dtoBase(), dias: 7, bodegaId: 1 },
        admin,
      );
      expect(porBodega.materiales.find(m => m.materialId === 1)?.salidasEnVentana).toBe(1);
    });

    test('detecta anomalía cuando el consumo se dispara respecto del histórico', async () => {
      // Histórico disperso: 1 unidad cada ~4 días (24 días con consumo en 120).
      const historico = Array.from({ length: 24 }, (_, i) => ({
        materialId: 1,
        fecha: haceDias(32 + i * 3),
        cantidad: 1,
        tipo: 'EGRESO',
        bodegaOrigenId: null,
        bodegaDestinoId: null,
      }));
      // Ventana actual: 60 salidas en 30 días (2 und./día) → 10× el histórico.
      const ventana = Array.from({ length: 60 }, (_, i) => ({
        materialId: 1,
        fecha: haceDias((i % 30) + 1),
        cantidad: 1,
        tipo: 'EGRESO',
        bodegaOrigenId: null,
        bodegaDestinoId: null,
      }));

      movRepo.query.mockResolvedValue([...ventana, ...historico]);
      materialRepo.query.mockResolvedValue([materiales[0]]);

      const resultado = await service.obtenerPrediccion(dtoBase(), admin);
      const cemento = resultado.materiales[0];

      expect(cemento.materialId).toBe(1);
      expect(cemento.consumoPromedio).toBe(2);
      expect(cemento.diasHistoria).toBe(24);
      expect(cemento.esAnomalo).toBe(true);
      expect(cemento.z).toBeGreaterThan(2);
      expect(cemento.variacionPct).toBeGreaterThan(0);
    });

    test('soloAlertas filtra a los materiales con alerta activa', async () => {
      const resultado = await service.obtenerPrediccion({ ...dtoBase(), soloAlertas: true }, admin);

      expect(resultado.materiales.map(m => m.materialId)).toEqual([2, 1]);
      // El resumen sigue describiendo el alcance completo evaluado.
      expect(resultado.resumen.totalMateriales).toBe(4);
    });

    test('respeta el límite de materiales', async () => {
      const resultado = await service.obtenerPrediccion({ ...dtoBase(), limite: 2 }, admin);

      expect(resultado.materiales).toHaveLength(2);
    });

    test('respeta umbrales propios de crítico y riesgo', async () => {
      const resultado = await service.obtenerPrediccion(
        { ...dtoBase(), umbralCritico: 5, umbralRiesgo: 15 },
        admin,
      );

      // 6 días: ya no es CRITICO con umbral 5, pero sigue en RIESGO.
      expect(resultado.materiales.find(m => m.materialId === 1)?.nivel).toBe('RIESGO');
    });
  });

  describe('generarAlertas', () => {
    test('emite el evento dos veces (BODEGUERO y ADMIN) por cada alerta', async () => {
      const resultado = await service.generarAlertas(dtoBase(), admin);

      expect(resultado.evaluados).toBe(4);
      expect(resultado.alertasGeneradas).toBe(2); // AGOTADO + CRITICO (SIN_DATOS no alerta)
      expect(eventEmitter.emit).toHaveBeenCalledTimes(4);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notificacion.crear',
        expect.objectContaining({ entidad: 'Material', rolDestino: 'BODEGUERO' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notificacion.crear',
        expect.objectContaining({ entidad: 'Material', rolDestino: 'ADMIN' }),
      );
    });

    test('NO emite si ya existe una notificación sin leer en 24 h', async () => {
      notificationsService.existeNoLeidaReciente.mockResolvedValue(true);

      const resultado = await service.generarAlertas(dtoBase(), admin);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(resultado.alertasGeneradas).toBe(0);
      expect(resultado.alertasOmitidasPorDuplicado).toBe(2);
      expect(resultado.alertas.every(a => !a.notificada)).toBe(true);
    });

    test('pregunta por el tipo y el material concretos', async () => {
      await service.generarAlertas(dtoBase(), admin);

      expect(notificationsService.existeNoLeidaReciente).toHaveBeenCalledWith('STOCK_AGOTADO', '2', 24);
      expect(notificationsService.existeNoLeidaReciente).toHaveBeenCalledWith('STOCK_QUIEBRE', '1', 24);
    });

    test('registra la acción en auditoría con el recuento', async () => {
      await service.generarAlertas(dtoBase(), admin);

      expect(auditoriaService.registrarAccion).toHaveBeenCalledWith(
        'u-admin',
        'GENERAR_ALERTAS_PREVISION',
        'Prevision',
        { evaluados: 4, generadas: 2, omitidas: 0 },
      );
    });

    test('un fallo de auditoría no impide generar las alertas', async () => {
      auditoriaService.registrarAccion.mockRejectedValue(new Error('mongo caído'));

      const resultado = await service.generarAlertas(dtoBase(), admin);

      expect(resultado.alertasGeneradas).toBe(2);
    });

    test('el mensaje lleva solo números calculados, sin texto generado', async () => {
      const resultado = await service.generarAlertas(dtoBase(), admin);
      const riesgo = resultado.alertas.find(a => a.nivel === 'CRITICO')!;

      expect(riesgo.mensaje).toContain('6');
      expect(riesgo.mensaje).toMatch(/0\.7333/);
      expect(riesgo.titulo).toMatch(/^Riesgo de quiebre: /);
    });
  });
});
