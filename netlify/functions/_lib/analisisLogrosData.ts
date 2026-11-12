/**
 * Carga y ensambla trayectos E1→E2→E3 para Análisis de logros.
 *
 * Emparejamiento de objetivos:
 * - L2 items.orden = slot del objetivo (alineado a sintoma_i / objetivo_i de L1).
 * - L2.objetivo_previo_label = texto del objetivo levantado en E1.
 * - L3 se vincula a L2 por seguimiento2_id; items L3 se emparejan por orden.
 * - Si hay varias L2 por documento, se elige la cadena más completa
 *   (prioriza L3, luego L2 más reciente).
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
  "id,created_at,documento,tipo_documento,nombres,apellidos,sede,encuestador,encuestador_nombre,payload_origen,fecha_evaluacion_previa,deleted_at";
const L3_COLS =
  "id,created_at,documento,tipo_documento,nombres,apellidos,sede,encuestador,encuestador_nombre,seguimiento2_id,deleted_at";
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
    // Fallback si deleted_at no existe en algún entorno legado
    let q2 = supabase
      .from("wakeup_seguimiento2")
      .select(L2_COLS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (sede) q2 = q2.eq("sede", sede);
    res = await q2;
  }
  if (res.error) throw new Error(`L2: ${res.error.message}`);
  return (res.data || []) as Row[];
}

async function fetchL3ForL2Ids(
  supabase: ReturnType<typeof getSupabase>,
  l2Ids: number[],
): Promise<Row[]> {
  if (!l2Ids.length) return [];
  const out: Row[] = [];
  const chunk = 80;
  for (let i = 0; i < l2Ids.length; i += chunk) {
    const slice = l2Ids.slice(i, i + chunk);
    let res = await supabase
      .from("wakeup_seguimiento3")
      .select(L3_COLS)
      .in("seguimiento2_id", slice)
      .is("deleted_at", null);
    if (res.error) {
      res = await supabase
        .from("wakeup_seguimiento3")
        .select(L3_COLS)
        .in("seguimiento2_id", slice);
    }
    if (res.error) throw new Error(`L3: ${res.error.message}`);
    out.push(...((res.data || []) as Row[]));
  }
  return out.filter((r) => r.deleted_at == null);
}

async function fetchItems(
  supabase: ReturnType<typeof getSupabase>,
  table: "wakeup_seguimiento2_items" | "wakeup_seguimiento3_items",
  fk: "seguimiento2_id" | "seguimiento3_id",
  ids: number[],
): Promise<Map<number, Row[]>> {
  const map = new Map<number, Row[]>();
  if (!ids.length) return map;
  const cols =
    "id,orden,sintoma_codigo,sintoma_label,objetivo_previo_codigo,objetivo_previo_label,evolucion,objetivo_seguimiento,es_meta_complementaria";
  const chunk = 80;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const res = await supabase.from(table).select(cols).in(fk, slice).order("orden", {
      ascending: true,
    });
    if (res.error) throw new Error(`${table}: ${res.error.message}`);
    for (const row of (res.data || []) as Row[]) {
      const parent = Number(row[fk]);
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

function pickL1ForL2(l1List: Row[] | undefined, l2: Row): Row | null {
  if (!l1List?.length) return null;
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
  // Fallback: L1 más cercana anterior a L2, o la más reciente
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

type Chain = {
  l1: Row | null;
  l2: Row | null;
  l3: Row | null;
  itemsL2: Row[];
  itemsL3: Row[];
};

function scoreChain(c: Chain): number {
  let s = 0;
  if (c.l3) s += 100;
  if (c.l2) s += 10;
  if (c.l1) s += 1;
  const t = c.l3
    ? new Date(String(c.l3.created_at)).getTime()
    : c.l2
      ? new Date(String(c.l2.created_at)).getTime()
      : 0;
  return s * 1e15 + (Number.isFinite(t) ? t : 0);
}

function chainToPaciente(c: Chain): PacienteLogrosAnalisis {
  const baseRow = c.l3 || c.l2 || c.l1 || {};
  const itemsE2 =
    c.itemsL2.length > 0
      ? c.itemsL2.map((it) => ({
          orden: Number(it.orden) || 0,
          objetivo_previo_label: String(it.objetivo_previo_label ?? "") || "—",
          sintoma_codigo: it.sintoma_codigo
            ? String(it.sintoma_codigo)
            : null,
          sintoma_label: it.sintoma_label ? String(it.sintoma_label) : null,
          evolucion: it.evolucion != null ? String(it.evolucion) : null,
          objetivo_seguimiento: it.objetivo_seguimiento
            ? String(it.objetivo_seguimiento)
            : null,
        }))
      : objetivosFromL1Fallback(c.l1);

  const itemsE3 = c.itemsL3.map((it) => ({
    orden: Number(it.orden) || 0,
    evolucion: it.evolucion != null ? String(it.evolucion) : null,
    objetivo_seguimiento: it.objetivo_seguimiento
      ? String(it.objetivo_seguimiento)
      : null,
  }));

  const objetivos = buildObjetivosDesdeItems({
    itemsE2,
    itemsE3: c.l3 ? itemsE3 : null,
  });

  const fecha_e1: string | null = c.l1?.created_at
    ? String(c.l1.created_at)
    : c.l2?.fecha_evaluacion_previa
      ? String(c.l2.fecha_evaluacion_previa)
      : null;
  const fecha_e2: string | null = c.l2?.created_at
    ? String(c.l2.created_at)
    : null;
  const fecha_e3: string | null = c.l3?.created_at
    ? String(c.l3.created_at)
    : null;

  return enriquecerPacienteAnalisis({
    documento: String(baseRow.documento ?? ""),
    tipo_documento: baseRow.tipo_documento
      ? String(baseRow.tipo_documento)
      : null,
    nombres: String(baseRow.nombres ?? c.l1?.nombres ?? ""),
    apellidos: String(baseRow.apellidos ?? c.l1?.apellidos ?? ""),
    sede: baseRow.sede
      ? String(baseRow.sede)
      : c.l1?.sede
        ? String(c.l1.sede)
        : null,
    plan: null,
    profesional_nombre: (() => {
      const n =
        c.l3?.encuestador_nombre ??
        c.l2?.encuestador_nombre ??
        null;
      const s = n != null ? String(n).trim() : "";
      return s || null;
    })(),
    profesional_cedula: (() => {
      const n =
        c.l3?.encuestador ?? c.l2?.encuestador ?? c.l1?.encuestador ?? null;
      if (n == null || n === "") return null;
      return String(n);
    })(),
    fecha_e1,
    fecha_e2,
    fecha_e3,
    tiene_e1: !!c.l1 || !!fecha_e1,
    tiene_e2: !!c.l2,
    tiene_e3: !!c.l3,
    objetivos,
  });
}

function matchesQuery(p: PacienteLogrosAnalisis, q: string | null | undefined): boolean {
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

export async function loadPacientesAnalisisFull(
  filtros: AnalisisFiltros,
): Promise<PacienteLogrosAnalisis[]> {
  const supabase = getSupabase();
  const sede = resolveSedeFiltro(filtros);
  const cap = Math.min(3000, Math.max(50, filtros.cap ?? 1500));
  const minEnc = Math.max(1, Math.min(3, filtros.min_encuestas ?? 2));

  const l2Rows = await fetchL2Batch(supabase, sede, cap);
  const l2Ids = l2Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const [l3Rows, itemsL2] = await Promise.all([
    fetchL3ForL2Ids(supabase, l2Ids),
    fetchItems(supabase, "wakeup_seguimiento2_items", "seguimiento2_id", l2Ids),
  ]);
  const l3Ids = l3Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const itemsL3 = await fetchItems(
    supabase,
    "wakeup_seguimiento3_items",
    "seguimiento3_id",
    l3Ids,
  );

  const l3ByL2 = new Map<number, Row>();
  for (const r of l3Rows) {
    const sid = Number(r.seguimiento2_id);
    if (Number.isFinite(sid)) l3ByL2.set(sid, r);
  }

  const docs = [
    ...new Set(l2Rows.map((r) => normDoc(r.documento)).filter(Boolean)),
  ];
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

  const bestByDoc = new Map<string, Chain>();
  for (const l2 of l2Rows) {
    const d = normDoc(l2.documento);
    if (!d) continue;
    const l2Id = Number(l2.id);
    const l3 = l3ByL2.get(l2Id) || null;
    const chain: Chain = {
      l1: pickL1ForL2(l1ByDoc.get(d), l2),
      l2,
      l3,
      itemsL2: itemsL2.get(l2Id) || [],
      itemsL3: l3 ? itemsL3.get(Number(l3.id)) || [] : [],
    };
    const prev = bestByDoc.get(d);
    if (!prev || scoreChain(chain) > scoreChain(prev)) {
      bestByDoc.set(d, chain);
    }
  }
  if (minEnc <= 1) {
    for (const [d, list] of l1ByDoc) {
      if (bestByDoc.has(d)) continue;
      const l1 = list[0];
      if (!l1) continue;
      bestByDoc.set(d, {
        l1,
        l2: null,
        l3: null,
        itemsL2: objetivosFromL1Fallback(l1),
        itemsL3: [],
      });
    }
  }

  let pacientes = [...bestByDoc.values()].map(chainToPaciente);
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
  return pacientes;
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
    .order("created_at", { ascending: false })
    .limit(40);
  if (scopeSede) l2q = l2q.eq("sede", scopeSede);
  let l2Res = await l2q;
  if (l2Res.error) {
    let l2q2 = supabase
      .from("wakeup_seguimiento2")
      .select(L2_COLS)
      .eq("documento", doc)
      .order("created_at", { ascending: false })
      .limit(40);
    if (scopeSede) l2q2 = l2q2.eq("sede", scopeSede);
    l2Res = await l2q2;
  }
  if (l2Res.error) throw new Error(`L2 doc: ${l2Res.error.message}`);
  const l2Rows = (l2Res.data || []) as Row[];

  const l1ByDoc = await fetchL1ByDocs(supabase, [doc]);

  if (!l2Rows.length) {
    const l1 = (l1ByDoc.get(doc) || [])[0];
    if (!l1) return null;
    if (scopeSede && String(l1.sede ?? "") !== scopeSede) return null;
    return chainToPaciente({
      l1,
      l2: null,
      l3: null,
      itemsL2: objetivosFromL1Fallback(l1),
      itemsL3: [],
    });
  }

  const l2Ids = l2Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const [l3Rows, itemsL2] = await Promise.all([
    fetchL3ForL2Ids(supabase, l2Ids),
    fetchItems(supabase, "wakeup_seguimiento2_items", "seguimiento2_id", l2Ids),
  ]);
  const l3Ids = l3Rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const itemsL3 = await fetchItems(
    supabase,
    "wakeup_seguimiento3_items",
    "seguimiento3_id",
    l3Ids,
  );
  const l3ByL2 = new Map<number, Row>();
  for (const r of l3Rows) {
    const sid = Number(r.seguimiento2_id);
    if (Number.isFinite(sid)) l3ByL2.set(sid, r);
  }

  let best: Chain | null = null;
  for (const l2 of l2Rows) {
    const l2Id = Number(l2.id);
    const l3 = l3ByL2.get(l2Id) || null;
    const chain: Chain = {
      l1: pickL1ForL2(l1ByDoc.get(doc), l2),
      l2,
      l3,
      itemsL2: itemsL2.get(l2Id) || [],
      itemsL3: l3 ? itemsL3.get(Number(l3.id)) || [] : [],
    };
    if (!best || scoreChain(chain) > scoreChain(best)) best = chain;
  }
  return best ? chainToPaciente(best) : null;
}
