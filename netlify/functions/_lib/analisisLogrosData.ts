/**
 * Carga y ensambla trayectos para Análisis de logros.
 *
 * Modelo real (sin tabla wakeup_seguimiento3):
 * - Encuesta 1 = Logros 1 (`wakeup_seguimientos`) — levanta objetivos.
 * - Encuesta 2 = primera Logros 2 (`wakeup_seguimiento2`, p. ej. L2-01).
 * - Encuesta 3 = última Logros 2 distinta de la primera (L2-02…L2-0N).
 *   Si solo hay L2-01, no hay Encuesta 3.
 *
 * Emparejamiento de objetivos: items.orden + objetivo_previo_label (texto E1).
 */

import { getSupabase } from "./supabase";
import {
  buildObjetivosDesdeItems,
  enriquecerPacienteAnalisis,
  pacienteEnRangoFechas,
  type PacienteLogrosAnalisis,
  aggregateKpis,
  type KpisLogros,
} from "./analisisLogros";

type Row = Record<string, unknown>;

export type AnalisisFiltros = {
  sede?: string | null;
  /** Fuerza sede (usuarios acotados); gana sobre sede libre si viene. */
  scope_sede?: string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  /** Reservado: no hay columna plan en BD. */
  plan?: string | null;
  q?: string | null;
  /** Default 2. Con 1 incluye solo-E1 como «Sin seguimiento». */
  min_encuestas?: number;
  page?: number;
  page_size?: number;
  /** Tope de pacientes a materializar (Excel / listado). */
  cap?: number;
};

const L2_COLS =
  "id,created_at,documento,tipo_documento,nombres,apellidos,sede,encuestador,encuestador_nombre,payload_origen,fecha_evaluacion_previa,consecutivo_paciente,codigo_seguimiento,deleted_at";
const L1_COLS =
  "id_int,created_at,documento,tipo_documento,nombres,apellidos,sede,encuestador,objetivo_1,objetivo_2,objetivo_3,objetivo_extra,sintoma_1,sintoma_2,sintoma_3";

function normDoc(d: unknown): string {
  return String(d ?? "")
    .trim()
    .toUpperCase();
}

function resolveSedeFiltro(f: AnalisisFiltros): string | undefined {
  const scope = String(f.scope_sede ?? "").trim();
  if (scope) return scope;
  const sede = String(f.sede ?? "").trim();
  return sede || undefined;
}

function sortL2Asc(a: Row, b: Row): number {
  const ca = Number(a.consecutivo_paciente) || 0;
  const cb = Number(b.consecutivo_paciente) || 0;
  if (ca > 0 && cb > 0 && ca !== cb) return ca - cb;
  const ta = new Date(String(a.created_at || "")).getTime();
  const tb = new Date(String(b.created_at || "")).getTime();
  return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
}

async function fetchL2Batch(
  supabase: ReturnType<typeof getSupabase>,
  sede: string | undefined,
  limit: number,
): Promise<Row[]> {
  let q = supabase
    .from("wakeup_seguimiento2")
    .select(L2_COLS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (sede) q = q.eq("sede", sede);
  let res = await q;
  if (res.error) {
    // Fallback: sin deleted_at / sin consecutivo en entornos legados
    const colsLite = L2_COLS.replace(",consecutivo_paciente", "").replace(
      ",codigo_seguimiento",
      "",
    );
    let q2 = supabase
      .from("wakeup_seguimiento2")
      .select(colsLite)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (sede) q2 = q2.eq("sede", sede);
    res = await q2;
    if (res.error) {
      let q3 = supabase
        .from("wakeup_seguimiento2")
        .select(colsLite)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (sede) q3 = q3.eq("sede", sede);
      res = await q3;
    }
  }
  if (res.error) throw new Error(`L2: ${res.error.message}`);
  return ((res.data || []) as Row[]).filter((r) => r.deleted_at == null);
}

async function fetchItems(
  supabase: ReturnType<typeof getSupabase>,
  ids: number[],
): Promise<Map<number, Row[]>> {
  const map = new Map<number, Row[]>();
  if (!ids.length) return map;
  const cols =
    "id,seguimiento2_id,orden,sintoma_codigo,sintoma_label,objetivo_previo_codigo,objetivo_previo_label,evolucion,objetivo_seguimiento,es_meta_complementaria";
  const chunk = 80;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const res = await supabase
      .from("wakeup_seguimiento2_items")
      .select(cols)
      .in("seguimiento2_id", slice)
      .order("orden", { ascending: true });
    if (res.error) throw new Error(`wakeup_seguimiento2_items: ${res.error.message}`);
    for (const row of (res.data || []) as Row[]) {
      const parent = Number(row.seguimiento2_id);
      if (!Number.isFinite(parent)) continue;
      const list = map.get(parent) || [];
      list.push(row);
      map.set(parent, list);
    }
  }
  return map;
}

async function fetchL1ByDocs(
  supabase: ReturnType<typeof getSupabase>,
  docs: string[],
): Promise<Map<string, Row[]>> {
  const map = new Map<string, Row[]>();
  if (!docs.length) return map;
  const chunk = 80;
  for (let i = 0; i < docs.length; i += chunk) {
    const slice = docs.slice(i, i + chunk);
    const res = await supabase
      .from("wakeup_seguimientos")
      .select(L1_COLS)
      .in("documento", slice)
      .order("created_at", { ascending: false });
    if (res.error) throw new Error(`L1: ${res.error.message}`);
    for (const row of (res.data || []) as Row[]) {
      const d = normDoc(row.documento);
      const list = map.get(d) || [];
      list.push(row);
      map.set(d, list);
    }
  }
  return map;
}

function fase1RefFromL2(l2: Row): { id_int?: number; created_at?: string } {
  const po = (l2.payload_origen || {}) as Row;
  const fr = (po.fase1_referencia || {}) as Row;
  const id = Number(fr.id_int);
  return {
    id_int: Number.isFinite(id) && id > 0 ? id : undefined,
    created_at: fr.created_at ? String(fr.created_at) : undefined,
  };
}

function pickL1ForL2(l1List: Row[] | undefined, l2: Row | null): Row | null {
  if (!l1List?.length) return null;
  if (!l2) return l1List[0] || null;
  const ref = fase1RefFromL2(l2);
  if (ref.id_int != null) {
    const byId = l1List.find((r) => Number(r.id_int) === ref.id_int);
    if (byId) return byId;
  }
  if (ref.created_at) {
    const byDate = l1List.find(
      (r) => String(r.created_at) === String(ref.created_at),
    );
    if (byDate) return byDate;
  }
  const l2t = new Date(String(l2.created_at || "")).getTime();
  const prev = l1List
    .filter((r) => {
      const t = new Date(String(r.created_at || "")).getTime();
      return Number.isFinite(t) && Number.isFinite(l2t) && t <= l2t;
    })
    .sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime(),
    )[0];
  return prev || l1List[0] || null;
}

function objetivosFromL1Fallback(l1: Row | null): Array<{
  orden: number;
  objetivo_previo_label: string;
  sintoma_codigo: string | null;
  sintoma_label: string | null;
  evolucion: null;
  objetivo_seguimiento: null;
}> {
  if (!l1) return [];
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const obj = String(l1[`objetivo_${i}`] ?? "").trim();
    const sin = String(l1[`sintoma_${i}`] ?? "").trim();
    if (!obj && !sin) continue;
    out.push({
      orden: i,
      objetivo_previo_label: obj || "—",
      sintoma_codigo: sin || null,
      sintoma_label: null,
      evolucion: null,
      objetivo_seguimiento: null,
    });
  }
  const extra = String(l1.objetivo_extra ?? "").trim();
  if (extra) {
    out.push({
      orden: out.length + 1,
      objetivo_previo_label: extra,
      sintoma_codigo: null,
      sintoma_label: "Meta complementaria",
      evolucion: null,
      objetivo_seguimiento: null,
    });
  }
  return out;
}

type Trayecto = {
  l1: Row | null;
  /** Primera Logros 2 (Encuesta 2). */
  l2First: Row | null;
  /** Última Logros 2 distinta de la primera (Encuesta 3). Null si solo hay una L2. */
  l2Last: Row | null;
  itemsFirst: Row[];
  itemsLast: Row[];
};

function mapItemE2(it: Row) {
  return {
    orden: Number(it.orden) || 0,
    objetivo_previo_label: String(it.objetivo_previo_label ?? "") || "—",
    sintoma_codigo: it.sintoma_codigo ? String(it.sintoma_codigo) : null,
    sintoma_label: it.sintoma_label ? String(it.sintoma_label) : null,
    evolucion: it.evolucion != null ? String(it.evolucion) : null,
    objetivo_seguimiento: it.objetivo_seguimiento
      ? String(it.objetivo_seguimiento)
      : null,
  };
}

function mapItemE3(it: Row) {
  return {
    orden: Number(it.orden) || 0,
    evolucion: it.evolucion != null ? String(it.evolucion) : null,
    objetivo_seguimiento: it.objetivo_seguimiento
      ? String(it.objetivo_seguimiento)
      : null,
  };
}

function trayectoToPaciente(t: Trayecto): PacienteLogrosAnalisis {
  const baseRow = t.l2Last || t.l2First || t.l1 || {};
  const tieneSegundaL2 =
    !!t.l2First &&
    !!t.l2Last &&
    Number(t.l2First.id) !== Number(t.l2Last.id);

  const itemsE2 =
    t.itemsFirst.length > 0
      ? t.itemsFirst.map(mapItemE2)
      : objetivosFromL1Fallback(t.l1);

  const itemsE3 = tieneSegundaL2 ? t.itemsLast.map(mapItemE3) : null;

  const objetivos = buildObjetivosDesdeItems({
    itemsE2,
    itemsE3,
  });

  const fecha_e1: string | null = t.l1?.created_at
    ? String(t.l1.created_at)
    : t.l2First?.fecha_evaluacion_previa
      ? String(t.l2First.fecha_evaluacion_previa)
      : null;
  const fecha_e2: string | null = t.l2First?.created_at
    ? String(t.l2First.created_at)
    : null;
  const fecha_e3: string | null = tieneSegundaL2 && t.l2Last?.created_at
    ? String(t.l2Last.created_at)
    : null;

  const profRow = t.l2Last || t.l2First;

  return enriquecerPacienteAnalisis({
    documento: String(baseRow.documento ?? ""),
    tipo_documento: baseRow.tipo_documento
      ? String(baseRow.tipo_documento)
      : null,
    nombres: String(baseRow.nombres ?? t.l1?.nombres ?? ""),
    apellidos: String(baseRow.apellidos ?? t.l1?.apellidos ?? ""),
    sede: baseRow.sede
      ? String(baseRow.sede)
      : t.l1?.sede
        ? String(t.l1.sede)
        : null,
    plan: null,
    profesional_nombre: (() => {
      const n = profRow?.encuestador_nombre ?? null;
      const s = n != null ? String(n).trim() : "";
      return s || null;
    })(),
    profesional_cedula: (() => {
      const n =
        profRow?.encuestador ?? t.l1?.encuestador ?? null;
      if (n == null || n === "") return null;
      return String(n);
    })(),
    fecha_e1,
    fecha_e2,
    fecha_e3,
    tiene_e1: !!t.l1 || !!fecha_e1,
    tiene_e2: !!t.l2First,
    tiene_e3: tieneSegundaL2,
    objetivos,
  });
}

function buildTrayectoFromL2List(
  l2List: Row[],
  l1List: Row[] | undefined,
  itemsByL2: Map<number, Row[]>,
): Trayecto {
  const sorted = [...l2List].sort(sortL2Asc);
  const l2First = sorted[0] || null;
  const l2Last =
    sorted.length >= 2 ? sorted[sorted.length - 1] : null;
  const firstId = l2First ? Number(l2First.id) : NaN;
  const lastId = l2Last ? Number(l2Last.id) : NaN;
  return {
    l1: pickL1ForL2(l1List, l2First),
    l2First,
    l2Last:
      Number.isFinite(lastId) &&
      Number.isFinite(firstId) &&
      lastId !== firstId
        ? l2Last
        : null,
    itemsFirst: Number.isFinite(firstId)
      ? itemsByL2.get(firstId) || []
      : [],
    itemsLast:
      Number.isFinite(lastId) && lastId !== firstId
        ? itemsByL2.get(lastId) || []
        : [],
  };
}

function matchesQuery(
  p: PacienteLogrosAnalisis,
  q: string | null | undefined,
): boolean {
  const raw = String(q ?? "").trim();
  if (!raw) return true;
  const needle = raw.toLowerCase();
  const doc = normDoc(p.documento);
  const name = p.nombre_completo.toLowerCase();
  const digitos = raw.replace(/\D/g, "");
  if (digitos.length >= 5 && doc.includes(digitos.toUpperCase())) return true;
  if (doc.includes(normDoc(raw))) return true;
  return name.includes(needle);
}

function groupL2ByDoc(l2Rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of l2Rows) {
    const d = normDoc(row.documento);
    if (!d) continue;
    const list = map.get(d) || [];
    list.push(row);
    map.set(d, list);
  }
  return map;
}

export async function loadPacientesAnalisisFull(
  filtros: AnalisisFiltros,
): Promise<PacienteLogrosAnalisis[]> {
  const supabase = getSupabase();
  const sede = resolveSedeFiltro(filtros);
  const cap = Math.min(3000, Math.max(50, filtros.cap ?? 1500));
  const minEnc = Math.max(1, Math.min(3, filtros.min_encuestas ?? 2));

  // Pedimos más filas L2 que el cap de pacientes (varios L2 por doc).
  const l2Rows = await fetchL2Batch(supabase, sede, Math.min(8000, cap * 4));
  const l2ByDoc = groupL2ByDoc(l2Rows);

  const l2Ids = l2Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const itemsByL2 = await fetchItems(supabase, l2Ids);

  const docs = [...l2ByDoc.keys()];
  const l1ByDoc = await fetchL1ByDocs(supabase, docs);

  if (minEnc <= 1) {
    let qL1 = supabase
      .from("wakeup_seguimientos")
      .select(L1_COLS)
      .order("created_at", { ascending: false })
      .limit(cap);
    if (sede) qL1 = qL1.eq("sede", sede);
    const resL1 = await qL1;
    if (!resL1.error && Array.isArray(resL1.data)) {
      for (const row of resL1.data as Row[]) {
        const d = normDoc(row.documento);
        if (!d) continue;
        const list = l1ByDoc.get(d) || [];
        if (!list.some((x) => Number(x.id_int) === Number(row.id_int))) {
          list.push(row);
          l1ByDoc.set(d, list);
        }
        if (!docs.includes(d)) docs.push(d);
      }
    }
  }

  const trayectos = new Map<string, Trayecto>();
  for (const [d, list] of l2ByDoc) {
    trayectos.set(d, buildTrayectoFromL2List(list, l1ByDoc.get(d), itemsByL2));
  }
  if (minEnc <= 1) {
    for (const [d, list] of l1ByDoc) {
      if (trayectos.has(d)) continue;
      const l1 = list[0];
      if (!l1) continue;
      trayectos.set(d, {
        l1,
        l2First: null,
        l2Last: null,
        itemsFirst: objetivosFromL1Fallback(l1),
        itemsLast: [],
      });
    }
  }

  let pacientes = [...trayectos.values()].map(trayectoToPaciente);
  pacientes = pacientes.filter((p) =>
    pacienteEnRangoFechas(p, filtros.fecha_desde, filtros.fecha_hasta),
  );
  pacientes = pacientes.filter((p) => matchesQuery(p, filtros.q));
  const planFiltro = String(filtros.plan ?? "").trim();
  if (planFiltro && planFiltro.toLowerCase() !== "todos") {
    pacientes = pacientes.filter(
      (p) =>
        String(p.plan ?? "")
          .trim()
          .toLowerCase() === planFiltro.toLowerCase(),
    );
  }
  pacientes = pacientes.filter((p) => p.num_encuestas >= minEnc);
  pacientes.sort((a, b) => {
    const ta = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
    const tb = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
    return tb - ta;
  });
  return pacientes.slice(0, cap);
}

/** Recalcula listado con KPIs sobre el set filtrado completo. */
export async function loadListadoAnalisis(filtros: AnalisisFiltros): Promise<{
  pacientes: PacienteLogrosAnalisis[];
  kpis: KpisLogros;
  total: number;
  page: number;
  page_size: number;
}> {
  const page = Math.max(1, filtros.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filtros.page_size ?? 20));
  const all = await loadPacientesAnalisisFull(filtros);
  const kpis = aggregateKpis(all);
  const start = (page - 1) * pageSize;
  return {
    pacientes: all.slice(start, start + pageSize),
    kpis,
    total: all.length,
    page,
    page_size: pageSize,
  };
}

export async function loadComparativaPorDocumento(
  documento: string,
  scopeSede?: string | null,
): Promise<PacienteLogrosAnalisis | null> {
  const doc = normDoc(documento);
  if (!doc) return null;

  const supabase = getSupabase();
  let l2q = supabase
    .from("wakeup_seguimiento2")
    .select(L2_COLS)
    .eq("documento", doc)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(80);
  if (scopeSede) l2q = l2q.eq("sede", scopeSede);
  let l2Res = await l2q;
  if (l2Res.error) {
    const colsLite = L2_COLS.replace(",consecutivo_paciente", "").replace(
      ",codigo_seguimiento",
      "",
    );
    let l2q2 = supabase
      .from("wakeup_seguimiento2")
      .select(colsLite)
      .eq("documento", doc)
      .order("created_at", { ascending: true })
      .limit(80);
    if (scopeSede) l2q2 = l2q2.eq("sede", scopeSede);
    l2Res = await l2q2;
  }
  if (l2Res.error) throw new Error(`L2 doc: ${l2Res.error.message}`);
  const l2Rows = ((l2Res.data || []) as Row[]).filter(
    (r) => r.deleted_at == null,
  );

  const l1ByDoc = await fetchL1ByDocs(supabase, [doc]);

  if (!l2Rows.length) {
    const l1 = (l1ByDoc.get(doc) || [])[0];
    if (!l1) return null;
    if (scopeSede && String(l1.sede ?? "") !== scopeSede) return null;
    return trayectoToPaciente({
      l1,
      l2First: null,
      l2Last: null,
      itemsFirst: objetivosFromL1Fallback(l1),
      itemsLast: [],
    });
  }

  const l2Ids = l2Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const itemsByL2 = await fetchItems(supabase, l2Ids);
  const trayecto = buildTrayectoFromL2List(
    l2Rows,
    l1ByDoc.get(doc),
    itemsByL2,
  );
  return trayectoToPaciente(trayecto);
}
