import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MovimientoInventario } from '../movimientos/entities/movimiento-inventario.entity';
import { Inventario } from '../inventario/inventario.entity';
import { Material } from '../materiales/material.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrediccionQueryDto } from './dto/prediccion-query.dto';
import {
  PrevisionResponse,
  ResumenPrevision,
  ResultadoAlertas,
  AlertaGenerada,
} from './dto/prediccion-response';
import {
  PrevisionMaterial,
  PuntoSerie,
  MINIMO_SALIDAS_PARA_PRONOSTICO,
  calcularConsumoPromedio,
  calcularDiasHastaAgotar,
  calcularTendencia,
  clasificarNivel,
  detectarAnomalia,
  ordenarPorUrgencia,
  variacionPorcentual,
} from './prevision.calculos';

const DIAS_HISTORICO = 90;
const SEMANAS_SERIE = 4;
const MILIS_POR_DIA = 24 * 60 * 60 * 1000;

export interface UsuarioPrevision {
  id: string;
  rol: string;
  bodegaIds?: number[];
}

interface FilaMovimiento {
  materialId: number;
  fecha: Date;
  cantidad: number;
  tipo: string;
  bodegaOrigenId: number | null;
  bodegaDestinoId: number | null;
}

interface StockRow {
  materialId: number;
  bodegaId: number;
  bodegaNombre: string | null;
  disponible: number;
  reservada: number;
}

interface MaterialRow {
  materialId: number;
  nombre: string;
  sku: string;
  unidad: string | null;
  categoria: string | null;
}

function lunesDe(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const desplazamiento = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desplazamiento);
  return d.getTime();
}

function isoFecha(milis: number): string {
  return new Date(milis).toISOString().slice(0, 10);
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function desviacionEstandarMuestral(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const varianza = valores.reduce((acc, v) => acc + (v - m) ** 2, 0) / (valores.length - 1);
  return Math.sqrt(varianza);
}

@Injectable()
export class PrevisionService {
  private readonly logger = new Logger(PrevisionService.name);

  constructor(
    @InjectRepository(MovimientoInventario)
    private readonly movRepo: Repository<MovimientoInventario>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private resolverAlcances(dto: PrediccionQueryDto, usuario?: UsuarioPrevision): number[] | [null] {
    const esBodeguero = usuario?.rol === 'BODEGUERO';
    const asignadas = Array.isArray(usuario?.bodegaIds) ? usuario!.bodegaIds! : [];

    if (!esBodeguero) {
      if (dto.bodegaId !== undefined) return [dto.bodegaId];
      return [null];
    }

    if (dto.bodegaId !== undefined) {
      if (!asignadas.includes(dto.bodegaId)) {
        throw new ForbiddenException('No tiene permisos para consultar esta bodega');
      }
      return [dto.bodegaId];
    }

    return asignadas;
  }

  private async consultarMovimientos(fechaLimite: Date): Promise<FilaMovimiento[]> {
    return this.movRepo.query(
      `SELECT d.material_id                        AS "materialId",
              m.fecha                              AS "fecha",
              d.cantidad                           AS "cantidad",
              m.tipo                               AS "tipo",
              m.bodega_origen_id                   AS "bodegaOrigenId",
              m.bodega_destino_id                  AS "bodegaDestinoId"
         FROM detalles_movimiento d
         JOIN movimientos_inventario m ON m.id = d.movimiento_id
        WHERE m.estado = 'PROCESADO'
          AND m.tipo IN ('EGRESO', 'TRANSFERENCIA')
          AND m.fecha >= $1`,
      [fechaLimite],
    );
  }

  private async consultarStock(): Promise<StockRow[]> {
    return this.inventarioRepo.query(
      `SELECT sb.material_id          AS "materialId",
              sb.bodega_id            AS "bodegaId",
              b.nombre                AS "bodegaNombre",
              sb.cantidad_disponible  AS "disponible",
              sb.cantidad_reservada   AS "reservada"
         FROM stock_bodega sb
         LEFT JOIN bodegas b ON b.id = sb.bodega_id`,
    );
  }

  private async consultarMateriales(): Promise<MaterialRow[]> {
    return this.materialRepo.query(
      `SELECT mat.id             AS "materialId",
              mat.nombre         AS "nombre",
              mat.sku            AS "sku",
              um.simbolo         AS "unidad",
              c.nombre           AS "categoria"
         FROM materiales mat
         LEFT JOIN unidades_medida um ON um.id = mat.unidad_medida_id
         LEFT JOIN categorias c       ON c.id  = mat.categoria_id`,
    );
  }

  private esSalida(fila: FilaMovimiento, bodegaId: number | null): boolean {
    if (fila.tipo === 'EGRESO') return true;
    if (fila.tipo !== 'TRANSFERENCIA') return false;
    if (bodegaId === null) return false;
    return fila.bodegaOrigenId === bodegaId;
  }

  private construirSerieSemanal(filaSalidas: FilaMovimiento[], inicioVentana: Date, ahora: Date): PuntoSerie[] {
    const semanaActual = lunesDe(ahora);
    const inicios = Array.from({ length: SEMANAS_SERIE }, (_, i) => semanaActual - (SEMANAS_SERIE - 1 - i) * 7 * MILIS_POR_DIA);
    const porSemana = new Map<number, number>(inicios.map(inicio => [inicio, 0]));

    for (const fila of filaSalidas) {
      const inicioSemana = lunesDe(fila.fecha);
      if (!porSemana.has(inicioSemana)) continue;
      if (fila.fecha < inicioVentana) continue;
      porSemana.set(inicioSemana, porSemana.get(inicioSemana)! + Number(fila.cantidad || 0));
    }

    return inicios.map(inicio => ({ semana: isoFecha(inicio), consumo: porSemana.get(inicio)! }));
  }

  private construirConsumoDiario(filaSalidas: FilaMovimiento[], desde: Date, hasta: Date): Map<number, number> {
    const porDia = new Map<number, number>();
    const paso = MILIS_POR_DIA;
    const inicioDia = Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate());
    const finDia = Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), hasta.getUTCDate());

    for (let t = inicioDia; t < finDia; t += paso) {
      porDia.set(t, 0);
    }

    for (const fila of filaSalidas) {
      const fecha = fila.fecha;
      if (fecha < desde || fecha >= hasta) continue;
      const clave = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
      porDia.set(clave, (porDia.get(clave) ?? 0) + Number(fila.cantidad || 0));
    }

    return porDia;
  }

  private calcular(dto: PrediccionQueryDto, usuario?: UsuarioPrevision): Promise<PrevisionMaterial[]> {
    const alcances = this.resolverAlcances(dto, usuario);

    if (alcances.length === 0) return Promise.resolve([]);

    const ahora = new Date();
    const inicioVentana = new Date(ahora.getTime() - dto.dias * MILIS_POR_DIA);
    const inicioHistorico = new Date(ahora.getTime() - (dto.dias + DIAS_HISTORICO) * MILIS_POR_DIA);

    return Promise.all([
      this.consultarMovimientos(inicioHistorico),
      this.consultarStock(),
      this.consultarMateriales(),
    ]).then(([movimientos, stock, materiales]) => {
      const filas: FilaMovimiento[] = movimientos.map((f: any) => ({
        materialId: Number(f.materialId),
        fecha: new Date(f.fecha),
        cantidad: Number(f.cantidad),
        tipo: String(f.tipo),
        bodegaOrigenId: f.bodegaOrigenId === null ? null : Number(f.bodegaOrigenId),
        bodegaDestinoId: f.bodegaDestinoId === null ? null : Number(f.bodegaDestinoId),
      }));

      const stockRows: StockRow[] = stock.map((s: any) => ({
        materialId: Number(s.materialId),
        bodegaId: Number(s.bodegaId),
        bodegaNombre: s.bodegaNombre ?? null,
        disponible: Number(s.disponible ?? 0),
        reservada: Number(s.reservada ?? 0),
      }));

      const resultado: PrevisionMaterial[] = [];

      for (const alcance of alcances) {
        const materialesDelAlcance = alcance === null
          ? materiales
          : materiales.filter((m: MaterialRow) =>
              stockRows.some(s => s.materialId === m.materialId && s.bodegaId === alcance),
            );

        for (const material of materialesDelAlcance as MaterialRow[]) {
          resultado.push(this.evaluarMaterial(material, alcance, filas, stockRows, dto, inicioVentana, inicioHistorico, ahora));
        }
      }

      return resultado;
    });
  }

  private evaluarMaterial(
    material: MaterialRow,
    bodegaId: number | null,
    filas: FilaMovimiento[],
    stockRows: StockRow[],
    dto: PrediccionQueryDto,
    inicioVentana: Date,
    inicioHistorico: Date,
    ahora: Date,
  ): PrevisionMaterial {
    const propias = filas.filter(f => f.materialId === material.materialId && this.esSalida(f, bodegaId));

    const enVentana = propias.filter(f => f.fecha >= inicioVentana);
    const enHistorico = propias.filter(f => f.fecha >= inicioHistorico && f.fecha < inicioVentana);

    const stockPropio = bodegaId === null
      ? stockRows.filter(s => s.materialId === material.materialId)
      : stockRows.filter(s => s.materialId === material.materialId && s.bodegaId === bodegaId);

    const stockActual = stockPropio.reduce((acc, s) => acc + s.disponible, 0);
    const stockReservado = stockPropio.reduce((acc, s) => acc + s.reservada, 0);
    const stockEfectivo = stockActual - stockReservado;

    const cantidadesVentana = enVentana.map(f => f.cantidad);
    const consumoPromedio = calcularConsumoPromedio(cantidadesVentana, dto.dias);
    const salidasEnVentana = cantidadesVentana.length;
    const diasHastaAgotar = calcularDiasHastaAgotar(stockEfectivo, consumoPromedio);
    const nivel = clasificarNivel(stockEfectivo, diasHastaAgotar, salidasEnVentana, dto.umbralCritico, dto.umbralRiesgo);

    const serieSemanal = this.construirSerieSemanal(enVentana, inicioVentana, ahora);
    const { tendencia, pendiente } = calcularTendencia(serieSemanal.map(p => p.consumo));

    const historicoPorDia = this.construirConsumoDiario(enHistorico, inicioHistorico, inicioVentana);
    const valoresHistoricos = [...historicoPorDia.values()];
    const mediaHist = media(valoresHistoricos);
    const desvHist = desviacionEstandarMuestral(valoresHistoricos);
    const diasHistoria = valoresHistoricos.filter(v => v > 0).length;

    const consumoDiarioVentana = dto.dias > 0 ? cantidadesVentana.reduce((a, b) => a + b, 0) / dto.dias : 0;
    const { esAnomalo, z } = detectarAnomalia(consumoDiarioVentana, mediaHist, desvHist, diasHistoria);
    const variacionPct = variacionPorcentual(consumoDiarioVentana, mediaHist);

    const puntoBodega = stockPropio.find(s => s.bodegaId === bodegaId);

    return {
      materialId: material.materialId,
      nombre: material.nombre,
      sku: material.sku,
      unidad: material.unidad ?? undefined,
      categoria: material.categoria ?? undefined,
      bodegaId: bodegaId ?? undefined,
      bodegaNombre: bodegaId === null ? undefined : (puntoBodega?.bodegaNombre ?? undefined),
      stockActual,
      stockReservado,
      stockEfectivo,
      consumoPromedio,
      diasHastaAgotar,
      nivel,
      tendencia,
      pendiente,
      serieSemanal,
      esAnomalo,
      z,
      variacionPct,
      salidasEnVentana,
      diasHistoria,
    };
  }

  private construirResumen(materiales: PrevisionMaterial[]): ResumenPrevision {
    const cuenta = (nivel: string) => materiales.filter(m => m.nivel === nivel).length;
    return {
      totalMateriales: materiales.length,
      agotados: cuenta('AGOTADO'),
      criticos: cuenta('CRITICO'),
      riesgo: cuenta('RIESGO'),
      estables: cuenta('ESTABLE'),
      sinDatos: cuenta('SIN_DATOS'),
      anomalias: materiales.filter(m => m.esAnomalo).length,
      criticosSinCobertura: 0,
    };
  }

  async obtenerPrediccion(dto: PrediccionQueryDto, usuario?: UsuarioPrevision): Promise<PrevisionResponse> {
    const calculadas = await this.calcular(dto, usuario);
    const resumen = this.construirResumen(calculadas);

    const ordenadas = ordenarPorUrgencia(calculadas);
    const filtradas = dto.soloAlertas
      ? ordenadas.filter(m => ['AGOTADO', 'CRITICO', 'RIESGO'].includes(m.nivel) || m.esAnomalo)
      : ordenadas;

    return {
      generadoEn: new Date().toISOString(),
      ventanaDias: dto.dias,
      alcance: {
        bodegaId: dto.bodegaId ?? null,
        nivel: dto.bodegaId !== undefined ? 'BODEGA' : 'GLOBAL',
      },
      resumen,
      materiales: filtradas.slice(0, dto.limite),
    };
  }

  /** Genera notificaciones de quiebre con filtro anti-spam de 24 horas. */
  async generarAlertas(dto: PrediccionQueryDto, usuario?: UsuarioPrevision): Promise<ResultadoAlertas> {
    const calculadas = ordenarPorUrgencia(await this.calcular(dto, usuario));

    const candidatas = calculadas.filter(
      m => ['AGOTADO', 'CRITICO', 'RIESGO'].includes(m.nivel) || m.esAnomalo,
    );

    const alertas: AlertaGenerada[] = [];
    let generadas = 0;
    let omitidas = 0;

    for (const material of candidatas) {
      const tipo = material.nivel === 'AGOTADO' ? 'STOCK_AGOTADO'
        : material.esAnomalo && material.nivel === 'ESTABLE' ? 'STOCK_ANOMALO'
        : 'STOCK_QUIEBRE';
      const titulo = this.tituloDeAlerta(material);
      const mensaje = this.mensajeDeAlerta(material);

      const duplicada = await this.notificationsService.existeNoLeidaReciente(
        tipo,
        String(material.materialId),
        24,
      );

      if (duplicada) {
        omitidas++;
        alertas.push({ ...this.alertaBase(material, titulo, mensaje), notificada: false });
        continue;
      }

      for (const rolDestino of ['BODEGUERO', 'ADMIN']) {
        this.eventEmitter.emit('notificacion.crear', {
          tipo,
          titulo,
          mensaje,
          entidad: 'Material',
          entidadId: String(material.materialId),
          rolDestino,
        });
      }

      generadas++;
      alertas.push({ ...this.alertaBase(material, titulo, mensaje), notificada: true });
    }

    try {
      await this.auditoriaService.registrarAccion(usuario?.id ?? 'sistema', 'GENERAR_ALERTAS_PREVISION', 'Prevision', {
        evaluados: calculadas.length,
        generadas,
        omitidas,
      });
    } catch (error) {
      this.logger.error('Error al auditar la generación de alertas de previsión:', error);
    }

    return {
      evaluados: calculadas.length,
      alertasGeneradas: generadas,
      alertasOmitidasPorDuplicado: omitidas,
      alertas,
    };
  }

  private alertaBase(material: PrevisionMaterial, titulo: string, mensaje: string) {
    return {
      materialId: material.materialId,
      nivel: material.nivel,
      diasHastaAgotar: material.diasHastaAgotar,
      titulo,
      mensaje,
    };
  }

  private tituloDeAlerta(material: PrevisionMaterial): string {
    if (material.nivel === 'AGOTADO') return `Stock agotado: ${material.nombre}`;
    if (material.esAnomalo) return `Consumo anómalo: ${material.nombre}`;
    return `Riesgo de quiebre: ${material.nombre}`;
  }

  private mensajeDeAlerta(material: PrevisionMaterial): string {
    const unidad = material.unidad ?? 'und.';
    const partes: string[] = [];

    if (material.nivel === 'AGOTADO') {
      partes.push(`El stock efectivo es ${material.stockEfectivo} ${unidad} y no hay disponible para consumir.`);
    } else {
      partes.push(
        `Quedan ~${material.diasHastaAgotar} días de stock (${material.stockEfectivo} ${unidad}, ` +
        `consumo ${material.consumoPromedio} ${unidad}/día).`,
      );
    }

    if (material.tendencia !== 'ESTABLE' && material.variacionPct !== null) {
      partes.push(
        `La tendencia de consumo ${material.tendencia === 'SUBE' ? 'SUBE' : 'BAJA'} ` +
        `(${material.variacionPct > 0 ? '+' : ''}${material.variacionPct}% vs. histórico).`,
      );
    } else if (material.esAnomalo && material.z !== null) {
      partes.push(`Consumo anómalo detectado (z=${material.z}).`);
    }

    if (material.salidasEnVentana < MINIMO_SALIDAS_PARA_PRONOSTICO && material.nivel === 'SIN_DATOS') {
      partes.push('Historial insuficiente para estimar la fecha de agotamiento.');
    }

    return partes.join(' ');
  }
}
