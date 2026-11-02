/** Motor de cálculo de la previsión de stock — funciones puras y deterministas. */

export type NivelQuiebre = 'AGOTADO' | 'CRITICO' | 'RIESGO' | 'ESTABLE' | 'SIN_DATOS';

export type Tendencia = 'SUBE' | 'BAJA' | 'ESTABLE';

export interface PuntoSerie {
  semana: string;
  consumo: number;
}

export interface PrevisionMaterial {
  materialId: number;
  nombre: string;
  sku: string;
  unidad?: string;
  categoria?: string;
  bodegaId?: number;
  bodegaNombre?: string;
  stockActual: number;
  stockReservado: number;
  stockEfectivo: number;
  consumoPromedio: number;
  diasHastaAgotar: number | null;
  nivel: NivelQuiebre;
  tendencia: Tendencia;
  pendiente: number;
  serieSemanal: PuntoSerie[];
  esAnomalo: boolean;
  z: number | null;
  variacionPct: number | null;
  salidasEnVentana: number;
  diasHistoria: number;
}

/** Salidas mínimas en la ventana para que el pronóstico sea fiable. */
export const MINIMO_SALIDAS_PARA_PRONOSTICO = 5;

const REDONDEO_CONSUMO = 4;

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Consumo promedio diario = Σ salidas / días. Nunca devuelve NaN ni Infinity. */
export function calcularConsumoPromedio(salidas: number[], dias: number): number {
  if (!Number.isFinite(dias) || dias <= 0) return 0;
  const total = salidas.reduce((acc, valor) => acc + (Number.isFinite(valor) ? valor : 0), 0);
  return redondear(total / dias, REDONDEO_CONSUMO);
}

/** Días hasta agotarse. `null` cuando no hay consumo; stock negativo → 0. */
export function calcularDiasHastaAgotar(stock: number, consumoPromedio: number): number | null {
  if (!Number.isFinite(consumoPromedio) || consumoPromedio <= 0) return null;
  if (!Number.isFinite(stock)) return 0;
  const dias = Math.ceil(stock / consumoPromedio);
  return dias < 0 ? 0 : dias;
}

/** Nivel de alerta. Prioridad: AGOTADO → SIN_DATOS → CRITICO → RIESGO → ESTABLE. */
export function clasificarNivel(
  stockActual: number,
  diasHastaAgotar: number | null,
  salidasEnVentana: number,
  umbralCritico: number,
  umbralRiesgo: number,
): NivelQuiebre {
  if (stockActual <= 0) return 'AGOTADO';

  if (salidasEnVentana < MINIMO_SALIDAS_PARA_PRONOSTICO) return 'SIN_DATOS';

  if (diasHastaAgotar === null) return 'ESTABLE';
  if (diasHastaAgotar < umbralCritico) return 'CRITICO';
  if (diasHastaAgotar < umbralRiesgo) return 'RIESGO';
  return 'ESTABLE';
}

/** Regresión lineal (OLS) sobre la serie semanal: b = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)². */
export function calcularTendencia(serieSemanal: number[]): { tendencia: Tendencia; pendiente: number } {
  const y = serieSemanal.map(v => (Number.isFinite(v) ? v : 0));
  const n = y.length;
  const media = n > 0 ? y.reduce((a, b) => a + b, 0) / n : 0;

  if (n < 2) return { tendencia: 'ESTABLE', pendiente: 0 };

  const xBarra = (n - 1) / 2;
  let numerador = 0;
  let denominador = 0;
  for (let i = 0; i < n; i++) {
    numerador += (i - xBarra) * (y[i] - media);
    denominador += (i - xBarra) ** 2;
  }
  const pendiente = redondear(denominador === 0 ? 0 : numerador / denominador, 4);

  if (media === 0) return { tendencia: 'ESTABLE', pendiente };

  const variacionHorizonte = (pendiente * 3) / media;
  if (pendiente > 0 && variacionHorizonte > 0.05) return { tendencia: 'SUBE', pendiente };
  if (pendiente < 0 && Math.abs(variacionHorizonte) > 0.05) return { tendencia: 'BAJA', pendiente };
  return { tendencia: 'ESTABLE', pendiente };
}

/** Detección de anomalía por z-score; `null` sin desviación ni historia suficiente. */
export function detectarAnomalia(
  consumoDiario: number,
  mediaHist: number,
  desvHist: number,
  diasHistoria: number,
): { esAnomalo: boolean; z: number | null } {
  if (!Number.isFinite(desvHist) || desvHist <= 0) return { esAnomalo: false, z: null };
  if (diasHistoria < MINIMO_SALIDAS_PARA_PRONOSTICO * 3) return { esAnomalo: false, z: null };

  const z = redondear((consumoDiario - mediaHist) / desvHist, 2);
  return { esAnomalo: z > 2, z };
}

/** Variación porcentual respecto del histórico; `null` si el histórico es 0. */
export function variacionPorcentual(actual: number, historica: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(historica) || historica === 0) return null;
  return redondear(((actual - historica) / historica) * 100, 1);
}

const ORDEN_NIVEL: Record<NivelQuiebre, number> = {
  AGOTADO: 0,
  CRITICO: 1,
  RIESGO: 2,
  ESTABLE: 3,
  SIN_DATOS: 4,
};

/** Orden por urgencia: nivel → días asc (null al final) → stock asc → nombre. */
export function ordenarPorUrgencia(items: PrevisionMaterial[]): PrevisionMaterial[] {
  return [...items].sort((a, b) => {
    const porNivel = ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel];
    if (porNivel !== 0) return porNivel;

    const diasA = a.diasHastaAgotar ?? Number.POSITIVE_INFINITY;
    const diasB = b.diasHastaAgotar ?? Number.POSITIVE_INFINITY;
    if (diasA !== diasB) return diasA - diasB;

    if (a.stockEfectivo !== b.stockEfectivo) return a.stockEfectivo - b.stockEfectivo;

    return a.nombre.localeCompare(b.nombre, 'es');
  });
}
