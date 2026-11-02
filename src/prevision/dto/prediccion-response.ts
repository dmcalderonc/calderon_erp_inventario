import { NivelQuiebre, Tendencia, PuntoSerie, PrevisionMaterial } from '../prevision.calculos';

export interface ResumenPrevision {
  totalMateriales: number;
  agotados: number;
  criticos: number;
  riesgo: number;
  estables: number;
  sinDatos: number;
  anomalias: number;
  criticosSinCobertura: number;
}

export interface AlcancePrevision {
  bodegaId: number | null;
  nivel: 'GLOBAL' | 'BODEGA';
}

export interface PrevisionResponse {
  generadoEn: string;
  ventanaDias: number;
  alcance: AlcancePrevision;
  resumen: ResumenPrevision;
  materiales: PrevisionMaterial[];
}

export interface AlertaGenerada {
  materialId: number;
  nivel: NivelQuiebre;
  diasHastaAgotar: number | null;
  titulo: string;
  mensaje: string;
  notificada: boolean;
}

export interface ResultadoAlertas {
  evaluados: number;
  alertasGeneradas: number;
  alertasOmitidasPorDuplicado: number;
  alertas: AlertaGenerada[];
}

export type { NivelQuiebre, Tendencia, PuntoSerie };
