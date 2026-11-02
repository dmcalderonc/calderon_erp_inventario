import {
  calcularConsumoPromedio,
  calcularDiasHastaAgotar,
  clasificarNivel,
  calcularTendencia,
  detectarAnomalia,
  variacionPorcentual,
  ordenarPorUrgencia,
} from './prevision.calculos';
import type { NivelQuiebre, PrevisionMaterial } from './prevision.calculos';

const item = (overrides: Partial<PrevisionMaterial>): PrevisionMaterial => ({
  materialId: 1,
  nombre: 'Material',
  sku: 'MAT-001',
  stockActual: 10,
  stockReservado: 0,
  stockEfectivo: 10,
  consumoPromedio: 1,
  diasHastaAgotar: 10,
  nivel: 'ESTABLE',
  tendencia: 'ESTABLE',
  pendiente: 0,
  serieSemanal: [],
  esAnomalo: false,
  z: null,
  variacionPct: null,
  salidasEnVentana: 30,
  diasHistoria: 60,
  ...overrides,
});

describe('prevision.calculos — consumo y días hasta agotar', () => {
  test('calcularConsumoPromedio suma y divide por la ventana', () => {
    expect(calcularConsumoPromedio([10, 20, 15], 30)).toBe(1.5);
  });

  test('calcularConsumoPromedio redondea a 4 decimales', () => {
    // 22 / 30 = 0.73333…
    expect(calcularConsumoPromedio([22], 30)).toBe(0.7333);
  });

  test('calcularConsumoPromedio no produce NaN con entradas sucias', () => {
    expect(calcularConsumoPromedio([NaN, 10], 30)).toBe(0.3333);
    expect(calcularConsumoPromedio([10], 0)).toBe(0);
    expect(calcularConsumoPromedio([], 30)).toBe(0);
  });

  test('calcularDiasHastaAgotar devuelve el techo del cociente', () => {
    expect(calcularDiasHastaAgotar(14, 1.5714)).toBe(9); // 8.91 → 9
    expect(calcularDiasHastaAgotar(10, 1)).toBe(10);
  });

  test('calcularDiasHastaAgotar devuelve null cuando no hay consumo', () => {
    expect(calcularDiasHastaAgotar(10, 0)).toBeNull();
    expect(calcularDiasHastaAgotar(10, -3)).toBeNull();
  });

  test('calcularDiasHastaAgotar nunca devuelve días negativos con stock sucio', () => {
    expect(calcularDiasHastaAgotar(-5, 2)).toBe(0);
  });
});

describe('prevision.calculos — clasificación de nivel (bordes 4.3)', () => {
  const nivel = (dias: number | null, stock = 100, salidas = 30): NivelQuiebre =>
    clasificarNivel(stock, dias, salidas, 7, 15);

  test('bordes exactos de los umbrales 7 y 15', () => {
    expect(nivel(6.9)).toBe('CRITICO');
    expect(nivel(7)).toBe('RIESGO');
    expect(nivel(14.9)).toBe('RIESGO');
    expect(nivel(15)).toBe('ESTABLE');
    expect(nivel(20)).toBe('ESTABLE');
  });

  test('respeta umbrales propios', () => {
    expect(clasificarNivel(100, 4, 30, 5, 10)).toBe('CRITICO');  // < 5
    expect(clasificarNivel(100, 6, 30, 5, 10)).toBe('RIESGO');   // >= 5 y < 10
    expect(clasificarNivel(100, 12, 30, 5, 10)).toBe('ESTABLE'); // >= 10
  });

  test('AGOTADO tiene prioridad absoluta con stock 0', () => {
    expect(nivel(null, 0)).toBe('AGOTADO');
    expect(nivel(null, 0, 0)).toBe('AGOTADO');
  });

  test('stock negativo (dato sucio) es AGOTADO, jamás un nivel calculado', () => {
    expect(nivel(10, -4)).toBe('AGOTADO');
    expect(clasificarNivel(-4, 3, 30, 7, 15)).toBe('AGOTADO');
  });

  test('SIN_DATOS con menos de 5 salidas en la ventana', () => {
    expect(clasificarNivel(50, 50, 4, 7, 15)).toBe('SIN_DATOS'); // 4 salidas → sin pronóstico
    expect(clasificarNivel(50, 10, 5, 7, 15)).toBe('RIESGO');    // 5 salidas → ya hay pronóstico
  });

  test('SIN_DATOS sin historial pero con stock sigue por delante de CRITICO', () => {
    expect(clasificarNivel(100, 1, 3, 7, 15)).toBe('SIN_DATOS');
  });

  test('consumo 0 con stock > 0 y con historial suficiente es ESTABLE', () => {
    expect(nivel(null, 50, 30)).toBe('ESTABLE');
  });
});

describe('prevision.calculos — tendencia (regresión lineal)', () => {
  test('serie creciente → SUBE', () => {
    const { tendencia, pendiente } = calcularTendencia([6, 8, 9, 12]);
    expect(tendencia).toBe('SUBE');
    expect(pendiente).toBe(1.9);
  });

  test('serie decreciente → BAJA', () => {
    expect(calcularTendencia([12, 9, 8, 6]).tendencia).toBe('BAJA');
  });

  test('serie plana → ESTABLE', () => {
    expect(calcularTendencia([10, 10, 10, 10])).toEqual({ tendencia: 'ESTABLE', pendiente: 0 });
  });

  test('media 0 → ESTABLE sin base (nunca divide entre cero)', () => {
    expect(calcularTendencia([0, 0, 0, 0]).tendencia).toBe('ESTABLE');
  });

  test('variación pequeña respecto de la media → ESTABLE', () => {
    // b = 0.5, media = 100 → (0.5*3)/100 = 0.015 < 0.05
    expect(calcularTendencia([99.5, 100, 100.5, 101]).tendencia).toBe('ESTABLE');
  });

  test('serie insuficiente → ESTABLE', () => {
    expect(calcularTendencia([])).toEqual({ tendencia: 'ESTABLE', pendiente: 0 });
    expect(calcularTendencia([5]).tendencia).toBe('ESTABLE');
  });
});

describe('prevision.calculos — anomalías (z-score)', () => {
  test('z > 2 con historia suficiente es anomalía', () => {
    expect(detectarAnomalia(10, 5, 2, 90)).toEqual({ esAnomalo: true, z: 2.5 });
  });

  test('desviación 0 (consumo constante) nunca es anomalía', () => {
    expect(detectarAnomalia(50, 5, 0, 90)).toEqual({ esAnomalo: false, z: null });
  });

  test('menos de 15 días de historia no dispara anomalía', () => {
    expect(detectarAnomalia(10, 5, 2, 10).esAnomalo).toBe(false);
    expect(detectarAnomalia(10, 5, 2, 14).esAnomalo).toBe(false);
    expect(detectarAnomalia(10, 5, 2, 15).esAnomalo).toBe(true);
  });

  test('z ≤ 2 no es anomalía', () => {
    expect(detectarAnomalia(9, 5, 2, 90)).toEqual({ esAnomalo: false, z: 2 });
    expect(detectarAnomalia(5, 5, 2, 90).esAnomalo).toBe(false);
  });
});

describe('prevision.calculos — variación porcentual', () => {
  test('calcula el porcentaje de incremento', () => {
    expect(variacionPorcentual(218.4, 100)).toBe(118.4);
    expect(variacionPorcentual(50, 100)).toBe(-50);
  });

  test('devuelve null cuando el histórico es 0', () => {
    expect(variacionPorcentual(10, 0)).toBeNull();
  });
});

describe('prevision.calculos — ordenarPorUrgencia', () => {
  test('ordena por nivel: AGOTADO < CRITICO < RIESGO < ESTABLE < SIN_DATOS', () => {
    const niveles: NivelQuiebre[] = ['SIN_DATOS', 'ESTABLE', 'RIESGO', 'CRITICO', 'AGOTADO'];
    const ordenado = ordenarPorUrgencia(
      niveles.map((nivel, i) => item({ materialId: i, nivel, nombre: `M${i}` })),
    );

    expect(ordenado.map(m => m.nivel)).toEqual([
      'AGOTADO', 'CRITICO', 'RIESGO', 'ESTABLE', 'SIN_DATOS',
    ]);
  });

  test('dentro de un nivel ordena por días ascendente y el null va al final', () => {
    const ordenado = ordenarPorUrgencia([
      item({ materialId: 1, nivel: 'CRITICO', diasHastaAgotar: 5, nombre: 'B' }),
      item({ materialId: 2, nivel: 'CRITICO', diasHastaAgotar: null, nombre: 'C' }),
      item({ materialId: 3, nivel: 'CRITICO', diasHastaAgotar: 2, nombre: 'A' }),
    ]);

    expect(ordenado.map(m => m.materialId)).toEqual([3, 1, 2]);
  });

  test('desempate por menor stock efectivo y luego por nombre (caso B7)', () => {
    const ordenado = ordenarPorUrgencia([
      item({ materialId: 1, nivel: 'CRITICO', diasHastaAgotar: 3, stockEfectivo: 20, nombre: 'Zeta' }),
      item({ materialId: 2, nivel: 'CRITICO', diasHastaAgotar: 3, stockEfectivo: 5, nombre: 'Alfa' }),
      item({ materialId: 3, nivel: 'CRITICO', diasHastaAgotar: 3, stockEfectivo: 5, nombre: 'Beta' }),
    ]);

    expect(ordenado.map(m => m.materialId)).toEqual([2, 3, 1]);
  });

  test('no muta la lista de entrada', () => {
    const entrada = [item({ materialId: 1, nivel: 'SIN_DATOS' }), item({ materialId: 2, nivel: 'AGOTADO' })];
    const copia = [...entrada];

    ordenarPorUrgencia(entrada);

    expect(entrada).toEqual(copia);
  });
});
