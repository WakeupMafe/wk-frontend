/**
 * Lógica compartida de «Análisis de logros».
 * Usada por listado, comparativa y Excel (Netlify Functions).
 *
 * Mapeo DB (4 valores evolucion) → UI (3 estados):
 *   mejora_sustancial → Mejoró
 *   mejora_parcial    → Mejoró  (mejora parcial cuenta como mejora para tendencia;
 *                        decisión de producto por defecto — ver comentario abajo)
 *   sin_cambio_clinico_relevante → Igual (Se mantuvo igual)
 *   desmejoria        → Desmejoró
 *   null / desconocido → Sin evaluar (excluido de % y tendencia)
 *
 * También acepta nivel_mejora de UI (mucho/poco/nada/desmejoria) por defensa.
 */

export type EstadoLogro = "mejoro" | "igual" | "desmejoro" | "sin_evaluar";

export type TendenciaGeneral =
  | "mejora_general"
  | "estable"
  | "desmejora"
  | "sin_seguimiento";

export const ESTADO_LABEL: Record<EstadoLogro, string> = {
  mejoro: "Mejoró",
  igual: "Se mantuvo igual",
  desmejoro: "Desmejoró",
  sin_evaluar: "Sin evaluar",
};

export const ESTADO_LABEL_CORTO: Record<EstadoLogro, string> = {
  mejoro: "Mejoró",
  igual: "Igual",
  desmejoro: "Desmejoró",
  sin_evaluar: "Sin evaluar",
};

export const TENDENCIA_LABEL: Record<TendenciaGeneral, string> = {
  mejora_general: "Mejora general",
  estable: "Estable",
  desmejora: "Desmejora",
  sin_seguimiento: "Sin seguimiento",
};

/** Orden clínico para «cambio desde E2»: Desmejoró < Igual < Mejoró */
const ESTADO_RANK: Record<EstadoLogro, number> = {
  desmejoro: 0,
  igual: 1,
  mejoro: 2,
  sin_evaluar: -1,
};

/**
 * Producto: `mejora_parcial` (UI «poco») cuenta como Mejoró.
 * Si clínica prefiere tratarlo como Igual, cambiar solo este mapa.
 */
const EVOLUCION_A_ESTADO: Record<string, EstadoLogro> = {
  mejora_sustancial: "mejoro",
  mejora_parcial: "mejoro",
  sin_cambio_clinico_relevante: "igual",
  desmejoria: "desmejoro",
  // nivel_mejora (UI)
  mucho: "mejoro",
  poco: "mejoro",
  nada: "igual",
  // ya normalizado
  mejoro: "mejoro",
  igual: "igual",
  desmejoro: "desmejoro",
};

export function mapEvolucionToEstado(
  evolucion: string | null | undefined,
): EstadoLogro {
  if (evolucion == null) return "sin_evaluar";
  const key = String(evolucion).trim().toLowerCase();
  if (!key) return "sin_evaluar";
  return EVOLUCION_A_ESTADO[key] ?? "sin_evaluar";
}

export function isEvaluado(estado: EstadoLogro): boolean {
  return estado === "mejoro" || estado === "igual" || estado === "desmejoro";
}

export type ConteosEstado = {
  mejoro: number;
  igual: number;
  desmejoro: number;
  sin_evaluar: number;
  total_evaluados: number;
};

export function emptyConteos(): ConteosEstado {
  return {
    mejoro: 0,
    igual: 0,
    desmejoro: 0,
    sin_evaluar: 0,
    total_evaluados: 0,
  };
}

export function contarEstados(estados: EstadoLogro[]): ConteosEstado {
  const c = emptyConteos();
  for (const e of estados) {
    if (e === "mejoro") c.mejoro += 1;
    else if (e === "igual") c.igual += 1;
    else if (e === "desmejoro") c.desmejoro += 1;
    else c.sin_evaluar += 1;
  }
  c.total_evaluados = c.mejoro + c.igual + c.desmejoro;
  return c;
}

export function pctMejora(conteos: ConteosEstado): number | null {
  if (conteos.total_evaluados <= 0) return null;
  return Math.round((conteos.mejoro / conteos.total_evaluados) * 100);
}

export function tendenciaFromConteos(
  conteos: ConteosEstado,
  tieneSeguimiento: boolean,
): TendenciaGeneral {
  if (!tieneSeguimiento) return "sin_seguimiento";
  if (conteos.total_evaluados <= 0) return "estable";
  if (conteos.mejoro > conteos.desmejoro) return "mejora_general";
  if (conteos.desmejoro > conteos.mejoro) return "desmejora";
  return "estable";
}

export function tendenciaExplicacion(
  tendencia: TendenciaGeneral,
  conteos: ConteosEstado,
): string {
  if (tendencia === "sin_seguimiento") {
    return "El paciente solo tiene Encuesta 1 (levantamiento); aún no hay seguimiento.";
  }
  if (conteos.total_evaluados <= 0) {
    return "No hay objetivos evaluados en la última encuesta.";
  }
  if (tendencia === "mejora_general") {
    return `Hay más objetivos que mejoraron (${conteos.mejoro}) que los que desmejoraron (${conteos.desmejoro}).`;
  }
  if (tendencia === "desmejora") {
    return `Hay más objetivos que desmejoraron (${conteos.desmejoro}) que los que mejoraron (${conteos.mejoro}).`;
  }
  return `La cantidad de objetivos que mejoraron (${conteos.mejoro}) es igual a los que desmejoraron (${conteos.desmejoro}).`;
}

export type CambioEntreEncuestas = {
  avanzaron: number;
  retrocedieron: number;
  sin_cambio_de_estado: number;
  sin_par_evaluable: number;
};

export function cambioEntreEstados(
  previos: EstadoLogro[],
  actuales: EstadoLogro[],
): CambioEntreEncuestas {
  const n = Math.max(previos.length, actuales.length);
  let avanzaron = 0;
  let retrocedieron = 0;
  let sin_cambio_de_estado = 0;
  let sin_par_evaluable = 0;
  for (let i = 0; i < n; i++) {
    const a = previos[i] ?? "sin_evaluar";
    const b = actuales[i] ?? "sin_evaluar";
    if (!isEvaluado(a) || !isEvaluado(b)) {
      sin_par_evaluable += 1;
      continue;
    }
    const ra = ESTADO_RANK[a];
    const rb = ESTADO_RANK[b];
    if (rb > ra) avanzaron += 1;
    else if (rb < ra) retrocedieron += 1;
    else sin_cambio_de_estado += 1;
  }
  return { avanzaron, retrocedieron, sin_cambio_de_estado, sin_par_evaluable };
}

export type ObjetivoComparado = {
  orden: number;
  objetivo_e1: string;
  sintoma_codigo: string | null;
  sintoma_label: string | null;
  estado_e2: EstadoLogro | null;
  estado_e3: EstadoLogro | null;
  observacion_e2: string | null;
  observacion_e3: string | null;
  /** Observación de la última encuesta con seguimiento */
  ultima_observacion: string | null;
};

export type EncuestaResumen = {
  fase: 1 | 2 | 3;
  id: number | string | null;
  fecha: string | null;
  titulo: string;
  subtitulo: string;
  conteos?: ConteosEstado;
};

export type PacienteLogrosAnalisis = {
  documento: string;
  tipo_documento: string | null;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  sede: string | null;
  /** No hay columna plan en BD; queda null hasta que producto lo defina. */
  plan: string | null;
  profesional_nombre: string | null;
  profesional_cedula: string | null;
  fecha_e1: string | null;
  fecha_e2: string | null;
  fecha_e3: string | null;
  tiene_e1: boolean;
  tiene_e2: boolean;
  tiene_e3: boolean;
  num_encuestas: number;
  num_objetivos: number;
  ultima_fase: 1 | 2 | 3;
  ultima_fecha: string | null;
  objetivos: ObjetivoComparado[];
  conteos_ultima: ConteosEstado;
  conteos_e2: ConteosEstado | null;
  conteos_e3: ConteosEstado | null;
  pct_mejora_ultima: number | null;
  tendencia: TendenciaGeneral;
  tendencia_label: string;
  tendencia_explicacion: string;
  cambio_desde_e2: CambioEntreEncuestas | null;
  timeline: EncuestaResumen[];
  /** Fechas usadas para filtro de rango (cualquier encuesta del trayecto). */
  fechas_trayecto: string[];
};

export function buildObjetivosDesdeItems(args: {
  itemsE2: Array<{
    orden: number;
    objetivo_previo_label?: string | null;
    sintoma_codigo?: string | null;
    sintoma_label?: string | null;
    evolucion?: string | null;
    objetivo_seguimiento?: string | null;
  }>;
  itemsE3?: Array<{
    orden: number;
    evolucion?: string | null;
    objetivo_seguimiento?: string | null;
  }> | null;
}): ObjetivoComparado[] {
  const byOrden = new Map<number, ObjetivoComparado>();

  for (const it of args.itemsE2) {
    const orden = Number(it.orden) || 0;
    if (orden <= 0) continue;
    const estado = mapEvolucionToEstado(it.evolucion);
    const obs = String(it.objetivo_seguimiento ?? "").trim() || null;
    byOrden.set(orden, {
      orden,
      objetivo_e1: String(it.objetivo_previo_label ?? "").trim() || "—",
      sintoma_codigo: it.sintoma_codigo ? String(it.sintoma_codigo) : null,
      sintoma_label: it.sintoma_label ? String(it.sintoma_label) : null,
      estado_e2: estado,
      estado_e3: null,
      observacion_e2: obs,
      observacion_e3: null,
      ultima_observacion: obs,
    });
  }

  for (const it of args.itemsE3 || []) {
    const orden = Number(it.orden) || 0;
    if (orden <= 0) continue;
    const estado = mapEvolucionToEstado(it.evolucion);
    const obs = String(it.objetivo_seguimiento ?? "").trim() || null;
    const prev = byOrden.get(orden);
    if (prev) {
      prev.estado_e3 = estado;
      prev.observacion_e3 = obs;
      prev.ultima_observacion = obs || prev.ultima_observacion;
    } else {
      byOrden.set(orden, {
        orden,
        objetivo_e1: "—",
        sintoma_codigo: null,
        sintoma_label: null,
        estado_e2: null,
        estado_e3: estado,
        observacion_e2: null,
        observacion_e3: obs,
        ultima_observacion: obs,
      });
    }
  }

  return [...byOrden.values()].sort((a, b) => a.orden - b.orden);
}

export function enriquecerPacienteAnalisis(
  base: Omit<
    PacienteLogrosAnalisis,
    | "conteos_ultima"
    | "conteos_e2"
    | "conteos_e3"
    | "pct_mejora_ultima"
    | "tendencia"
    | "tendencia_label"
    | "tendencia_explicacion"
    | "cambio_desde_e2"
    | "num_objetivos"
    | "num_encuestas"
    | "ultima_fase"
    | "ultima_fecha"
    | "timeline"
    | "nombre_completo"
    | "fechas_trayecto"
  > & { objetivos: ObjetivoComparado[] },
): PacienteLogrosAnalisis {
  const nombre_completo =
    `${String(base.nombres || "").trim()} ${String(base.apellidos || "").trim()}`.trim() ||
    "Sin nombre";

  const tiene_e1 = !!base.tiene_e1 || !!base.fecha_e1;
  const tiene_e2 = !!base.tiene_e2 || !!base.fecha_e2;
  const tiene_e3 = !!base.tiene_e3 || !!base.fecha_e3;
  const num_encuestas = (tiene_e1 ? 1 : 0) + (tiene_e2 ? 1 : 0) + (tiene_e3 ? 1 : 0);

  const estadosE2 = base.objetivos.map((o) => o.estado_e2 ?? "sin_evaluar");
  const estadosE3 = base.objetivos.map((o) => o.estado_e3 ?? "sin_evaluar");
  const conteos_e2 = tiene_e2 ? contarEstados(estadosE2) : null;
  const conteos_e3 = tiene_e3 ? contarEstados(estadosE3) : null;

  const ultima_fase: 1 | 2 | 3 = tiene_e3 ? 3 : tiene_e2 ? 2 : 1;
  const ultima_fecha =
    ultima_fase === 3
      ? base.fecha_e3
      : ultima_fase === 2
        ? base.fecha_e2
        : base.fecha_e1;

  const estadosUltima =
    ultima_fase === 3
      ? estadosE3
      : ultima_fase === 2
        ? estadosE2
        : [];
  const conteos_ultima =
    ultima_fase === 1 ? emptyConteos() : contarEstados(estadosUltima);
  const tieneSeguimiento = ultima_fase >= 2;
  const tendencia = tendenciaFromConteos(conteos_ultima, tieneSeguimiento);
  const pct_mejora_ultima = tieneSeguimiento ? pctMejora(conteos_ultima) : null;

  const cambio_desde_e2 =
    tiene_e2 && tiene_e3
      ? cambioEntreEstados(estadosE2, estadosE3)
      : null;

  const timeline: EncuestaResumen[] = [];
  if (tiene_e1) {
    timeline.push({
      fase: 1,
      id: null,
      fecha: base.fecha_e1,
      titulo: "Encuesta 1",
      subtitulo: "Levantamiento de objetivos",
      conteos: undefined,
    });
  }
  if (tiene_e2 && conteos_e2) {
    timeline.push({
      fase: 2,
      id: null,
      fecha: base.fecha_e2,
      titulo: "Encuesta 2",
      subtitulo: "Primer seguimiento (Logros 2)",
      conteos: conteos_e2,
    });
  }
  if (tiene_e3 && conteos_e3) {
    timeline.push({
      fase: 3,
      id: null,
      fecha: base.fecha_e3,
      titulo: "Encuesta 3",
      subtitulo: "Último seguimiento (Logros 2)",
      conteos: conteos_e3,
    });
  }

  const fechas_trayecto = [base.fecha_e1, base.fecha_e2, base.fecha_e3].filter(
    (f): f is string => !!f,
  );

  return {
    ...base,
    nombre_completo,
    tiene_e1,
    tiene_e2,
    tiene_e3,
    num_encuestas,
    num_objetivos: base.objetivos.length,
    ultima_fase,
    ultima_fecha,
    conteos_ultima,
    conteos_e2,
    conteos_e3,
    pct_mejora_ultima,
    tendencia,
    tendencia_label: TENDENCIA_LABEL[tendencia],
    tendencia_explicacion: tendenciaExplicacion(tendencia, conteos_ultima),
    cambio_desde_e2,
    timeline,
    fechas_trayecto,
  };
}

export type KpisLogros = {
  pacientes_con_seguimiento: number;
  pacientes_mejora_general: number;
  pacientes_estables: number;
  pacientes_desmejora: number;
  pacientes_sin_seguimiento: number;
  objetivos_mejoro: number;
  objetivos_igual: number;
  objetivos_desmejoro: number;
  objetivos_evaluados: number;
  pct_mejoro: number | null;
  pct_igual: number | null;
  pct_desmejoro: number | null;
};

/** KPIs globales: suma de objetivos evaluados (no promedio de % por paciente). */
export function aggregateKpis(pacientes: PacienteLogrosAnalisis[]): KpisLogros {
  let pacientes_con_seguimiento = 0;
  let pacientes_mejora_general = 0;
  let pacientes_estables = 0;
  let pacientes_desmejora = 0;
  let pacientes_sin_seguimiento = 0;
  let objetivos_mejoro = 0;
  let objetivos_igual = 0;
  let objetivos_desmejoro = 0;

  for (const p of pacientes) {
    if (p.tendencia === "sin_seguimiento") {
      pacientes_sin_seguimiento += 1;
      continue;
    }
    pacientes_con_seguimiento += 1;
    if (p.tendencia === "mejora_general") pacientes_mejora_general += 1;
    else if (p.tendencia === "desmejora") pacientes_desmejora += 1;
    else pacientes_estables += 1;

    objetivos_mejoro += p.conteos_ultima.mejoro;
    objetivos_igual += p.conteos_ultima.igual;
    objetivos_desmejoro += p.conteos_ultima.desmejoro;
  }

  const objetivos_evaluados =
    objetivos_mejoro + objetivos_igual + objetivos_desmejoro;
  const pct = (n: number) =>
    objetivos_evaluados > 0 ? Math.round((n / objetivos_evaluados) * 100) : null;

  return {
    pacientes_con_seguimiento,
    pacientes_mejora_general,
    pacientes_estables,
    pacientes_desmejora,
    pacientes_sin_seguimiento,
    objetivos_mejoro,
    objetivos_igual,
    objetivos_desmejoro,
    objetivos_evaluados,
    pct_mejoro: pct(objetivos_mejoro),
    pct_igual: pct(objetivos_igual),
    pct_desmejoro: pct(objetivos_desmejoro),
  };
}

export function formatFechaDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDocumentoDisplay(doc: string | null | undefined): string {
  const s = String(doc ?? "").trim();
  if (!s) return "—";
  if (/^\d+$/.test(s) && s.length > 3) {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return s;
}

export function fechaEnRango(
  iso: string | null | undefined,
  desde: string | null | undefined,
  hasta: string | null | undefined,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (desde) {
    const d0 = new Date(desde);
    if (!Number.isNaN(d0.getTime()) && t < d0.getTime()) return false;
  }
  if (hasta) {
    const d1 = new Date(hasta);
    if (!Number.isNaN(d1.getTime())) {
      // Inclusive end-of-day if date-only
      const end = String(hasta).length <= 10
        ? new Date(`${hasta}T23:59:59.999`).getTime()
        : d1.getTime();
      if (t > end) return false;
    }
  }
  return true;
}

export function pacienteEnRangoFechas(
  p: PacienteLogrosAnalisis,
  desde: string | null | undefined,
  hasta: string | null | undefined,
): boolean {
  if (!desde && !hasta) return true;
  return p.fechas_trayecto.some((f) => fechaEnRango(f, desde, hasta));
}
