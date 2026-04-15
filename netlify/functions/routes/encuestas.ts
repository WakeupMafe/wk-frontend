import type { HandlerResponse } from "@netlify/functions";
import { getSupabase } from "../_lib/supabase";
import { jsonResponse } from "../_lib/http";
import { incrementarEncuestasRealizadas } from "../_lib/incrementarEncuestaAutorizado";

type Row = Record<string, unknown>;

function errBody(detail: string | Record<string, unknown>) {
  return { detail };
}

function limpiarDocumentoEncuestador(doc: string): string {
  const d = (doc || "").trim();
  if (!/^\d+$/.test(d)) {
    throw new HttpErr(400, "El documento debe contener solo números.");
  }
  if (d.length < 6 || d.length > 11) {
    throw new HttpErr(
      400,
      "El documento debe tener entre 6 y 11 dígitos.",
    );
  }
  return d;
}

function limpiarDocumentoPaciente(
  doc: string,
  tipoDocumento: string | null | undefined,
): string {
  const t = (tipoDocumento || "").trim().toLowerCase();
  let d = (doc || "").trim();

  if (t === "registro_civil" || t === "pasaporte") {
    const cleaned = d.replace(/[^A-Za-z0-9\-]/g, "");
    if (cleaned.length < 5 || cleaned.length > 30) {
      throw new HttpErr(
        400,
        "Para registro civil o pasaporte use entre 5 y 30 caracteres (letras, números o guion).",
      );
    }
    return cleaned.toUpperCase();
  }

  if (!/^\d+$/.test(d)) {
    throw new HttpErr(400, "El documento debe contener solo números.");
  }
  if (d.length < 6 || d.length > 11) {
    throw new HttpErr(
      400,
      "El documento debe tener entre 6 y 11 dígitos.",
    );
  }
  return d;
}

function validarMinMax(
  lista: unknown[],
  campo: string,
  minV: number,
  maxV: number,
) {
  if (lista.length < minV) {
    throw new HttpErr(
      400,
      `${campo}: debe seleccionar mínimo ${minV}.`,
    );
  }
  if (lista.length > maxV) {
    throw new HttpErr(400, `${campo}: máximo ${maxV}.`);
  }
}

function aColumnaFija(
  items: (string | null | undefined)[],
  n = 3,
): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (let i = 0; i < n; i++) {
    out[`_${i + 1}`] = i < items.length ? items[i] : null;
  }
  return out;
}

class HttpErr extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const SINTOMAS_VALIDOS = new Set([
  "dolor",
  "intolerancia_postura",
  "limitacion_deporte",
  "trastorno_trabajo",
  "vida_social",
  "recrearse",
  "dormir",
  "escaleras",
  "levantarse_silla_cama",
  "autocuidado",
  "caminar_vehiculo",
  "recoger_objetos",
  "cargar_paquetes",
  "conducir",
  "otro",
]);

const TIPOS_DOC_VALIDOS = new Set([
  "pasaporte",
  "cedula",
  "tarjeta_identidad",
  "cedula_extranjeria",
  "registro_civil",
]);

const PATOLOGIA_RELACIONADA_VALIDAS = new Set([
  "rodilla",
  "hombro",
  "cadera",
  "lumbar",
  "funcional",
  "mano",
  "codo",
  "cuello",
  "pie",
]);

function sintomasEnFila(row: Row): Set<string> {
  return new Set(
    [row.sintoma_1, row.sintoma_2, row.sintoma_3].filter(
      (x) => x != null && x !== "",
    ) as string[],
  );
}

function filaCoincideSintomas(row: Row, sintomas: string[]): boolean {
  if (!sintomas.length) return true;
  const enFila = sintomasEnFila(row);
  return sintomas.some((s) => enFila.has(s));
}

function safeIlikeFragment(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim().slice(0, 200);
  if (!t) return null;
  return t.replace(/%/g, "").replace(/_/g, "");
}

function construirReferenciaRegistro(documento: string, idRegistro: number): string {
  return `${documento}-R${idRegistro}`;
}

/** Minúsculas, sin diacríticos, espacios colapsados (tolerancia tipo unaccent + ILIKE). */
function normalizeForPatientSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function rankingAutorizadosDesdeTabla(
  supabase: ReturnType<typeof getSupabase>,
  limit = 50,
): Promise<
  {
    cedula: unknown;
    nombres: string;
    apellidos: string;
    sede: string;
    encuestas_realizadas: number;
  }[]
> {
  const cols = "cedula,nombres,apellidos,sede,encuestas_realizadas";
  const res = await supabase
    .from("autorizados")
    .select(cols)
    .order("encuestas_realizadas", { ascending: false })
    .limit(limit);

  if (res.error) {
    console.warn("ranking_autorizados: error Supabase al leer autorizados:", res.error);
    return [];
  }

  const rows = res.data || [];
  const out: {
    cedula: unknown;
    nombres: string;
    apellidos: string;
    sede: string;
    encuestas_realizadas: number;
  }[] = [];

  for (const r of rows) {
    const rawN = r.encuestas_realizadas;
    if (rawN == null) continue;
    const n = parseInt(String(rawN), 10);
    if (!Number.isFinite(n)) continue;
    out.push({
      cedula: r.cedula,
      nombres: String(r.nombres ?? "").trim(),
      apellidos: String(r.apellidos ?? "").trim(),
      sede: String(r.sede ?? "").trim(),
      encuestas_realizadas: n,
    });
  }
  return out;
}

async function porSedeEncuestas(
  supabase: ReturnType<typeof getSupabase>,
): Promise<{ sede: string; count: number }[]> {
  const counter = new Map<string, number>();
  let offset = 0;
  const page = 1000;

  for (;;) {
    const res = await supabase
      .from("wakeup_seguimientos")
      .select("sede")
      .range(offset, offset + page - 1);

    if (res.error) throw res.error;
    const rows = res.data || [];
    for (const row of rows) {
      const s = String(row.sede ?? "").trim();
      const key = s || "Sin sede";
      counter.set(key, (counter.get(key) || 0) + 1);
    }
    if (rows.length < page) break;
    offset += page;
  }

  return [...counter.entries()]
    .map(([sede, count]) => ({ sede, count }))
    .sort((a, b) => b.count - a.count || a.sede.localeCompare(b.sede));
}

async function crearEncuesta(
  data: Record<string, unknown>,
  origin: string | null,
): Promise<HandlerResponse> {
  const docPaciente = limpiarDocumentoPaciente(
    String(data.documento ?? ""),
    String(data.tipoDocumento ?? ""),
  );
  const docEncuestador = limpiarDocumentoEncuestador(String(data.encuestador ?? ""));

  const sedeClean = String(data.sede ?? "").trim();
  if (!sedeClean) {
    return jsonResponse(400, errBody("La sede es obligatoria."), origin);
  }

  const sintomasTop = (data.sintomasTop as string[]) || [];
  validarMinMax(sintomasTop, "Síntomas", 1, 3);

  const objetivos = (data.objetivos as Record<string, string>) || {};
  const objetivosKeys = Object.keys(objetivos);
  validarMinMax(objetivosKeys, "Objetivos", 1, 3);

  const sintomasSet = new Set(sintomasTop);
  for (const s of objetivosKeys) {
    if (!sintomasSet.has(s)) {
      return jsonResponse(
        400,
        errBody(
          `El objetivo para '${s}' no es válido porque ese síntoma no está en los 3 seleccionados.`,
        ),
        origin,
      );
    }
  }

  if (sintomasSet.has("otro")) {
    const otro = String(data.otroSintoma ?? "").trim();
    if (!otro) {
      return jsonResponse(
        400,
        errBody("Debe especificar el síntoma 'Otro'."),
        origin,
      );
    }
  }

  const patologiaRel = String(data.patologiaRelacionada ?? "").trim();
  if (!PATOLOGIA_RELACIONADA_VALIDAS.has(patologiaRel)) {
    return jsonResponse(
      400,
      errBody(
        "Seleccione una patología relacionada válida (rodilla, hombro, cadera, lumbar, funcional, mano, codo, cuello o pie).",
      ),
      origin,
    );
  }

  const supabase = getSupabase();

  const yaExiste = await supabase
    .from("wakeup_seguimientos")
    .select("id_int", { count: "exact", head: true })
    .eq("documento", docPaciente);

  if (yaExiste.error) {
    return jsonResponse(
      400,
      errBody({ where: "SUPABASE SELECT DUP", error: yaExiste.error.message }),
      origin,
    );
  }
  const idRegistro = (yaExiste.count ?? 0) + 1;
  const referenciaRegistro = construirReferenciaRegistro(docPaciente, idRegistro);

  const sintomasOrdenados = sintomasTop.slice(0, 3);
  const textos = (data.textos as Record<string, string>) || {};
  const objetivosOrdenados: (string | null)[] = [];
  const detallesOrdenados: (string | null | undefined)[] = [];

  for (const s of sintomasOrdenados) {
    if (s in objetivos) {
      objetivosOrdenados.push(objetivos[s]!);
      detallesOrdenados.push(textos[s]);
    } else {
      objetivosOrdenados.push(null);
      detallesOrdenados.push(textos[s]);
    }
  }

  const objetivosSeleccionados = objetivosOrdenados.filter(
    (o): o is string => o != null && String(o).trim() !== "",
  ).length;
  if (objetivosSeleccionados < 1) {
    return jsonResponse(
      400,
      errBody("Debe seleccionar mínimo 1 objetivo."),
      origin,
    );
  }

  /* Mantener objetivo_i alineado con sintoma_i (no comprimir nulls: evita desajuste en Logros 2). */
  const objCols = aColumnaFija(objetivosOrdenados, 3);
  const sinCols = aColumnaFija(sintomasOrdenados, 3);

  const row = {
    encuestador: docEncuestador,
    sede: sedeClean,
    nombres: String(data.nombres ?? "").trim(),
    apellidos: String(data.apellidos ?? "").trim(),
    tipo_documento: data.tipoDocumento,
    documento: docPaciente,
    id_registro: idRegistro,
    referencia_registro: referenciaRegistro,
    patologia_relacionada: patologiaRel,
    limitacion_moverse: data.limitacionMoverse,
    actividades_afectadas: data.actividadesAfectadas ?? [],
    sintoma_1: sinCols._1,
    sintoma_2: sinCols._2,
    sintoma_3: sinCols._3,
    otro_sintoma: data.otroSintoma
      ? String(data.otroSintoma).trim()
      : null,
    objetivo_1: objCols._1,
    objetivo_2: objCols._2,
    objetivo_3: objCols._3,
    objetivos_seleccionados: objetivosSeleccionados,
    objetivo_extra: data.objetivoExtra,
    adicional_no_puede: data.adicionalNoPuede,
    ultima_vez: data.ultimaVez,
    que_impide: data.queImpide ?? [],
  };

  const res = await supabase.from("wakeup_seguimientos").insert(row).select();

  if (res.error) {
    return jsonResponse(
      400,
      errBody({
        where: "SUPABASE INSERT",
        error: res.error.message,
        row,
      }),
      origin,
    );
  }

  return jsonResponse(
    200,
    {
      ok: true,
      id_registro: idRegistro,
      referencia_registro: referenciaRegistro,
      data: res.data,
    },
    origin,
  );
}

const LOGROS2_NIVEL_A_EVOLUCION: Record<string, string> = {
  mucho: "mejora_sustancial",
  poco: "mejora_parcial",
  nada: "sin_cambio_clinico_relevante",
  desmejoria: "desmejoria",
};

/** Cuenta seguimientos L2 por documento y devuelve el último id (para encadenar padre). */
async function logros2PrecheckDocumento(
  queryParams: Record<string, string | undefined> | null,
  origin: string | null,
): Promise<HandlerResponse> {
  const docStr = queryParams?.documento?.trim();
  if (!docStr) {
    return jsonResponse(400, errBody("Falta el parámetro documento."), origin);
  }
  const tipoDoc = String(queryParams?.tipo_documento ?? "cedula").trim();
  let docPaciente: string;
  try {
    docPaciente = limpiarDocumentoPaciente(docStr, tipoDoc);
  } catch {
    return jsonResponse(400, errBody("Documento del paciente inválido."), origin);
  }
  const docNum = parseInt(docPaciente, 10);
  if (!Number.isFinite(docNum) || docNum <= 0) {
    return jsonResponse(
      400,
      errBody(
        "Para el precheck de seguimiento L2 use documento numérico (cédula) o indique tipo_documento compatible.",
      ),
      origin,
    );
  }

  const supabase = getSupabase();

  let count: number | null = null;
  const countFirst = await supabase
    .from("wakeup_seguimiento2")
    .select("*", { count: "exact", head: true })
    .eq("documento", docNum)
    .is("deleted_at", null);

  if (countFirst.error) {
    const retry = await supabase
      .from("wakeup_seguimiento2")
      .select("*", { count: "exact", head: true })
      .eq("documento", docNum);
    if (retry.error) {
      return jsonResponse(
        400,
        errBody({ where: "logros2-precheck", error: retry.error.message }),
        origin,
      );
    }
    count = retry.count ?? 0;
  } else {
    count = countFirst.count ?? 0;
  }

  let lastQ = supabase
    .from("wakeup_seguimiento2")
    .select("id, codigo_seguimiento")
    .eq("documento", docNum)
    .order("id", { ascending: false })
    .limit(1);
  let lastRes = await lastQ.is("deleted_at", null).maybeSingle();
  if (lastRes.error) {
    lastRes = await supabase
      .from("wakeup_seguimiento2")
      .select("id, codigo_seguimiento")
      .eq("documento", docNum)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const last = lastRes.data as
    | { id: unknown; codigo_seguimiento: unknown }
    | null
    | undefined;
  const ultimoId =
    last?.id != null && String(last.id).trim() !== ""
      ? Number(last.id)
      : null;
  const ultimoCodigo =
    last?.codigo_seguimiento != null
      ? String(last.codigo_seguimiento)
      : null;

  return jsonResponse(
    200,
    {
      ok: true,
      documento: docNum,
      cantidad: count ?? 0,
      tiene_seguimientos_previos: (count ?? 0) >= 1,
      ultimo_seguimiento2_id:
        ultimoId != null && Number.isFinite(ultimoId) ? ultimoId : null,
      ultimo_codigo_seguimiento: ultimoCodigo,
    },
    origin,
    { "Cache-Control": "no-store" },
  );
}

async function crearLogros2(
  data: Record<string, unknown>,
  origin: string | null,
): Promise<HandlerResponse> {
  const docPaciente = limpiarDocumentoPaciente(String(data.documento ?? ""), "cedula");
  const docEncuestador = limpiarDocumentoEncuestador(String(data.encuestador ?? ""));

  const sedeClean = String(data.sede ?? "").trim();
  if (!sedeClean) {
    return jsonResponse(400, errBody("La sede es obligatoria."), origin);
  }

  const items = (data.items as Record<string, unknown>[]) || [];
  if (!items.length) {
    return jsonResponse(
      400,
      errBody("Debe enviar al menos un ítem de seguimiento."),
      origin,
    );
  }

  const NIVELES = new Set(["mucho", "poco", "nada", "desmejoria"]);

  for (const it of items) {
    const slot = it.slot;
    const nivel = String(it.nivel_mejora ?? "");
    if (!NIVELES.has(nivel)) {
      return jsonResponse(
        400,
        errBody(
          `Nivel de mejora inválido en síntoma ${slot}: use mucho, poco, nada o desmejoria.`,
        ),
        origin,
      );
    }
    if (!LOGROS2_NIVEL_A_EVOLUCION[nivel]) {
      return jsonResponse(
        400,
        errBody(`Nivel de mejora sin mapeo a enum: ${nivel}`),
        origin,
      );
    }
    if (!String(it.nuevo_objetivo ?? "").trim()) {
      return jsonResponse(
        400,
        errBody(`Indique el nuevo objetivo para el síntoma ${slot}.`),
        origin,
      );
    }
  }

  const fr = (data.fase1_resumen as Record<string, unknown>) || {};
  const f1Ref = (data.fase1_referencia as Record<string, unknown>) || {};
  const refDocRaw = f1Ref.documento ?? data.documento;
  const refCreatedAt = String(f1Ref.created_at ?? "").trim();

  if (!refCreatedAt) {
    return jsonResponse(
      400,
      errBody(
        "Indique la evaluación Logros Fase 1 de referencia: falta created_at (fecha de la encuesta previa).",
      ),
      origin,
    );
  }

  const refDocNum = parseInt(String(refDocRaw ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(refDocNum) || refDocNum <= 0) {
    return jsonResponse(
      400,
      errBody(
        "Indique la evaluación Logros Fase 1 de referencia: documento inválido.",
      ),
      origin,
    );
  }

  const supabase = getSupabase();

  const check = await supabase
    .from("wakeup_seguimientos")
    .select(
      "documento, nombres, apellidos, tipo_documento, created_at, patologia_relacionada, limitacion_moverse, actividades_afectadas, adicional_no_puede, ultima_vez, que_impide, objetivo_extra",
    )
    .eq("documento", refDocNum)
    .eq("created_at", refCreatedAt)
    .maybeSingle();

  if (check.error) {
    return jsonResponse(
      400,
      errBody({
        where: "SUPABASE SELECT FASE1 por documento+created_at",
        error: check.error.message,
      }),
      origin,
    );
  }
  if (!check.data) {
    return jsonResponse(
      404,
      errBody(
        "No hay ninguna evaluación Logros Fase 1 en la base con el documento y la fecha de creación enviados. Vuelva a cargar la evaluación previa desde la búsqueda.",
      ),
      origin,
    );
  }

  const rowF1 = check.data as Record<string, unknown>;
  const docF1 = rowF1.documento;
  if (
    docF1 != null &&
    String(docF1).trim() !== String(docPaciente).trim()
  ) {
    return jsonResponse(
      400,
      errBody(
        "El documento del paciente no coincide con la evaluación Fase 1 seleccionada.",
      ),
      origin,
    );
  }
  const docPayloadNum = parseInt(String(docPaciente).replace(/\D/g, ""), 10);
  if (docPayloadNum !== refDocNum) {
    return jsonResponse(
      400,
      errBody(
        "El documento del payload no coincide con fase1_referencia.documento.",
      ),
      origin,
    );
  }

  const docNum = parseInt(docPaciente, 10);
  if (!Number.isFinite(docNum) || docNum <= 0) {
    return jsonResponse(400, errBody("Documento del paciente inválido."), origin);
  }

  const encNum = parseInt(docEncuestador, 10);
  if (!Number.isFinite(encNum)) {
    return jsonResponse(400, errBody("Documento del encuestador inválido."), origin);
  }

  const encuestadorNombre = String(data.encuestador_nombre ?? "").trim() || null;

  const padreRaw = data.seguimiento2_padre_id;
  let seguimiento2PadreId: number | null = null;
  if (padreRaw != null && String(padreRaw).trim() !== "") {
    const p = Number(padreRaw);
    if (!Number.isFinite(p) || p <= 0) {
      return jsonResponse(
        400,
        errBody("seguimiento2_padre_id inválido."),
        origin,
      );
    }
    let padreRow = await supabase
      .from("wakeup_seguimiento2")
      .select("id, documento")
      .eq("id", p)
      .is("deleted_at", null)
      .maybeSingle();
    if (padreRow.error) {
      padreRow = await supabase
        .from("wakeup_seguimiento2")
        .select("id, documento")
        .eq("id", p)
        .maybeSingle();
    }
    if (padreRow.error) {
      return jsonResponse(
        400,
        errBody({
          where: "validar seguimiento2_padre_id",
          error: padreRow.error.message,
        }),
        origin,
      );
    }
    if (!padreRow.data) {
      return jsonResponse(
        400,
        errBody(
          "El seguimiento padre indicado no existe o fue anulado.",
        ),
        origin,
      );
    }
    const docPadre = Number((padreRow.data as { documento: unknown }).documento);
    if (docPadre !== docNum) {
      return jsonResponse(
        400,
        errBody(
          "El seguimiento padre no corresponde al mismo documento del paciente.",
        ),
        origin,
      );
    }
    seguimiento2PadreId = p;
  }

  const parentRow: Record<string, unknown> = {
    tipo_documento: String(fr.tipo_documento ?? rowF1.tipo_documento ?? "cedula"),
    documento: docNum,
    nombres: (fr.nombres ?? rowF1.nombres) as string | null,
    apellidos: (fr.apellidos ?? rowF1.apellidos) as string | null,
    seguimiento2_padre_id: seguimiento2PadreId,
    sede: sedeClean,
    encuestador: encNum,
    encuestador_nombre: encuestadorNombre,
    origen: "logros_fase_1",
    estado: "finalizado",
    fecha_evaluacion_previa:
      (fr.fecha_evaluacion_previa as string | null) ??
      (rowF1.created_at as string | null) ??
      null,
    limitacion_moverse_label: (fr.limitacion_moverse_label as string | null) ?? null,
    actividades_afectadas_label:
      (fr.actividades_afectadas_label as string | null) ?? null,
    adicional_no_puede_label:
      (fr.adicional_no_puede_label as string | null) ?? null,
    ultima_vez_label: (fr.ultima_vez_label as string | null) ?? null,
    que_impide_label: (fr.que_impide_label as string | null) ?? null,
    meta_complementaria_previa:
      (fr.meta_complementaria_previa as string | null) ?? null,
    payload_origen: {
      fase1_referencia: { documento: refDocNum, created_at: refCreatedAt },
      patologia_fase1: rowF1.patologia_relacionada ?? null,
      sede: sedeClean,
    },
    payload_respuesta: items,
  };

  const resParent = await supabase
    .from("wakeup_seguimiento2")
    .insert(parentRow)
    .select("id, codigo_seguimiento")
    .single();

  if (resParent.error || resParent.data == null) {
    return jsonResponse(
      400,
      errBody({
        where: "SUPABASE INSERT wakeup_seguimiento2",
        error: resParent.error?.message ?? "sin fila",
        row: parentRow,
      }),
      origin,
    );
  }

  const seguimiento2Id = Number((resParent.data as { id: unknown }).id);
  if (!Number.isFinite(seguimiento2Id)) {
    return jsonResponse(
      400,
      errBody("No se obtuvo id del registro padre."),
      origin,
    );
  }

  const itemRows = items.map((it) => {
    const nivel = String(it.nivel_mejora ?? "");
    const evolucion = LOGROS2_NIVEL_A_EVOLUCION[nivel]!;
    const sintomaLabel = String(
      it.sintoma_label ?? it.sintoma ?? "—",
    ).trim() || "—";
    return {
      seguimiento2_id: seguimiento2Id,
      orden: Number(it.slot),
      sintoma_codigo:
        it.sintoma != null && String(it.sintoma).trim() !== ""
          ? String(it.sintoma)
          : null,
      sintoma_label: sintomaLabel,
      objetivo_previo_codigo:
        it.objetivo_previo_codigo != null &&
        String(it.objetivo_previo_codigo).trim() !== ""
          ? String(it.objetivo_previo_codigo)
          : null,
      objetivo_previo_label:
        String(it.objetivo_previo_label ?? "").trim() || "—",
      evolucion,
      objetivo_seguimiento: String(it.nuevo_objetivo ?? "").trim(),
      autocompletado_desde_objetivo_previo: !!it.autocompletado_desde_objetivo_previo,
      es_meta_complementaria: !!it.es_meta_complementaria,
      es_otro_sintoma: !!it.es_otro_sintoma,
    };
  });

  const resItems = await supabase
    .from("wakeup_seguimiento2_items")
    .insert(itemRows)
    .select();

  if (resItems.error) {
    await supabase.from("wakeup_seguimiento2").delete().eq("id", seguimiento2Id);
    return jsonResponse(
      400,
      errBody({
        where: "SUPABASE INSERT wakeup_seguimiento2_items",
        error: resItems.error.message,
        seguimiento2_id: seguimiento2Id,
      }),
      origin,
    );
  }

  const contador = await incrementarEncuestasRealizadas(supabase, encNum, 1);

  return jsonResponse(
    200,
    {
      ok: true,
      data: {
        seguimiento2: resParent.data,
        items: resItems.data,
      },
      encuestador_contador: contador.ok
        ? {
            ok: true,
            encuestas_realizadas: contador.despues,
            antes: contador.antes,
          }
        : { ok: false, error: contador.error },
    },
    origin,
  );
}

export async function handleEncuestas(
  pathname: string,
  method: string,
  body: unknown,
  origin: string | null,
  query: Record<string, string | undefined> | null,
): Promise<HandlerResponse | null> {
  const path = pathname.replace(/\/$/, "") || pathname;

  try {
    const isPostRoot =
      (path === "/encuestas" || path === "/encuestas/") && method === "POST";

    if (isPostRoot) {
      return await crearEncuesta(
        (body as Record<string, unknown>) || {},
        origin,
      );
    }

    if (path === "/encuestas/logros2" && method === "POST") {
      return await crearLogros2(
        (body as Record<string, unknown>) || {},
        origin,
      );
    }

    if (path === "/encuestas/logros2-precheck" && method === "GET") {
      return await logros2PrecheckDocumento(query, origin);
    }

    /**
     * Logros 2 — buscar paciente Fase 1. Versión mínima (Netlify):
     * - Solo dígitos (≥5): eq(documento) sin ilike.
     * - Texto (≥4 letras): OR ilike por palabra en nombres/apellidos + AND en memoria
     *   sobre nombres+apellidos normalizado (nombre en una columna y apellido en otra).
     */
    if (path === "/encuestas/buscar-logros1" && method === "GET") {
      const LOG = "[API buscar-logros1]";
      const qIn = query?.q ?? "";
      const qRaw = safeIlikeFragment(query?.q);
      const qTrim = (qRaw || "").trim();

      console.log(`${LOG} q_in=`, JSON.stringify(qIn));
      console.log(`${LOG} q_clean=`, JSON.stringify(qRaw));
      if (!qTrim) {
        return jsonResponse(400, errBody("Indique texto de búsqueda."), origin);
      }

      const soloLetras = qTrim.replace(/[^\p{L}]/gu, "");
      const soloDigitosInput = /^\d+$/.test(qTrim);
      const qDigits = qTrim.replace(/\D/g, "");
      const puedeDoc = soloDigitosInput && qDigits.length >= 5;
      const puedeNombre = soloLetras.length >= 4;

      if (!puedeNombre && !puedeDoc) {
        console.log(
          `${LOG} rechazo: letras=${soloLetras.length} soloDigitos=${soloDigitosInput} digitos=${qDigits.length}`,
        );
        return jsonResponse(
          400,
          errBody(
            "Use al menos 4 letras (nombre o apellido) o solo dígitos (≥5) para cédula.",
          ),
          origin,
        );
      }

      const filtrarSede = query?.filtrar_sede === "1";
      const sedeClean = query?.sede?.trim() || undefined;
      const maxResults = Math.min(
        40,
        Math.max(5, parseInt(query?.limit ?? "25", 10) || 25),
      );

      const cols =
        "id_int,documento,nombres,apellidos,tipo_documento,sede,created_at";
      const supabase = getSupabase();

      function seguimientosBase() {
        let b = supabase.from("wakeup_seguimientos").select(cols);
        if (filtrarSede && sedeClean) b = b.eq("sede", sedeClean);
        return b;
      }

      /** Cada token (normalizado sin tildes) debe aparecer en nombre+apellidos. */
      function filaCumpleTokens(
        nombres: unknown,
        apellidos: unknown,
        tokens: string[],
      ): boolean {
        const nom = normalizeForPatientSearch(
          `${String(nombres ?? "").trim()} ${String(apellidos ?? "").trim()}`,
        );
        if (!nom) return false;
        for (const tok of tokens) {
          const t = normalizeForPatientSearch(tok);
          if (t.length < 2) continue;
          if (!nom.includes(t)) return false;
        }
        return true;
      }

      let modo: "documento_eq" | "texto_tokens" = "texto_tokens";
      let rowsRaw: Row[] = [];
      let filterDesc = "";

      if (puedeDoc) {
        modo = "documento_eq";
        const n = Number(qDigits);
        const docEq: number | string =
          Number.isSafeInteger(n) && String(n) === qDigits ? n : qDigits;
        filterDesc = `documento.eq(${JSON.stringify(docEq)})`;
        console.log(`${LOG} modo=documento_eq filtro=${filterDesc}`);
        const res = await seguimientosBase().eq("documento", docEq).limit(20);
        if (res.error) {
          console.log(`${LOG} error supabase=`, res.error.message);
          return jsonResponse(
            400,
            errBody({ where: "buscar-logros1", error: res.error.message }),
            origin,
          );
        }
        rowsRaw = (res.data || []) as Row[];
      } else {
        modo = "texto_tokens";
        const tokens = qTrim
          .split(/\s+/)
          .map((t) => t.replace(/%/g, "").replace(/_/g, ""))
          .filter((t) => t.length >= 2);
        const orParts: string[] = [];
        for (const t of tokens) {
          orParts.push(`nombres.ilike.%${t}%`, `apellidos.ilike.%${t}%`);
        }
        filterDesc = `or(${orParts.join(",")}).limit(200)`;
        console.log(`${LOG} modo=texto_tokens tokens=`, JSON.stringify(tokens));
        console.log(`${LOG} filtro=`, filterDesc);
        const res = await seguimientosBase()
          .or(orParts.join(","))
          .order("created_at", { ascending: false })
          .limit(200);
        if (res.error) {
          console.log(`${LOG} error supabase=`, res.error.message);
          return jsonResponse(
            400,
            errBody({ where: "buscar-logros1", error: res.error.message }),
            origin,
          );
        }
        rowsRaw = (res.data || []) as Row[];
        const antes = rowsRaw.length;
        rowsRaw = rowsRaw.filter((r) =>
          filaCumpleTokens(r.nombres, r.apellidos, tokens),
        );
        console.log(
          `${LOG} filas_supabase=${antes} tras_and_memoria=${rowsRaw.length}`,
        );
      }

      const preview = rowsRaw.slice(0, 3).map((r) => ({
        documento: r.documento,
        nombres: r.nombres,
        apellidos: r.apellidos,
        tipo_documento: r.tipo_documento,
        sede: r.sede,
        created_at: r.created_at,
        ...(r.id_int != null && r.id_int !== ""
          ? { id_int: r.id_int }
          : {}),
      }));
      console.log(`${LOG} primeros=`, JSON.stringify(preview));

      rowsRaw.sort((a, b) => {
        const ta = String(a.created_at ?? "");
        const tb = String(b.created_at ?? "");
        return tb.localeCompare(ta);
      });

      const out = rowsRaw.slice(0, maxResults).map((r) => ({
        documento: r.documento,
        nombres: r.nombres,
        apellidos: r.apellidos,
        tipo_documento: r.tipo_documento,
        sede: r.sede,
        created_at: r.created_at,
        ...(r.id_int != null && r.id_int !== ""
          ? { id_int: r.id_int }
          : {}),
      }));

      return jsonResponse(
        200,
        {
          ok: true,
          resultados: out,
          total_escaneadas: rowsRaw.length,
          _debug: { modo, filtro: filterDesc },
        },
        origin,
        { "Cache-Control": "no-store" },
      );
    }

    const existsMatch = path.match(/^\/encuestas\/exists\/(.+)$/);
    if (existsMatch && method === "GET") {
      const documento = decodeURIComponent(existsMatch[1] || "");
      const tipoQ =
        query?.tipo_documento ?? query?.tipoDocumento ?? "cedula";
      const docPaciente = limpiarDocumentoPaciente(documento, tipoQ);
      const supabase = getSupabase();
      const res = await supabase
        .from("wakeup_seguimientos")
        .select(
          "id_int,patologia_relacionada,id_registro,referencia_registro,created_at",
          { count: "exact" },
        )
        .eq("documento", docPaciente)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (res.error) {
        return jsonResponse(
          400,
          errBody({ where: "encuesta exists", error: res.error.message }),
          origin,
        );
      }

      return jsonResponse(
        200,
        {
          ok: true,
          exists: !!res.data,
          total_previas: res.count ?? 0,
          patologia_relacionada: res.data?.patologia_relacionada ?? null,
          id_registro: res.data?.id_registro ?? null,
          referencia_registro: res.data?.referencia_registro ?? null,
        },
        origin,
      );
    }

    if (path === "/encuestas/estadisticas-generales" && method === "GET") {
      const supabase = getSupabase();
      const now = new Date();
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const totalRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true });
      if (totalRes.error) throw totalRes.error;
      const total = totalRes.count ?? 0;

      const conDolorRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true })
        .or(
          "sintoma_1.eq.dolor,sintoma_2.eq.dolor,sintoma_3.eq.dolor",
        );
      if (conDolorRes.error) throw conDolorRes.error;
      const con_dolor = conDolorRes.count ?? 0;

      const dormirRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true })
        .or(
          "sintoma_1.eq.dormir,sintoma_2.eq.dormir,sintoma_3.eq.dormir",
        );
      if (dormirRes.error) throw dormirRes.error;
      const con_trastorno_dormir = dormirRes.count ?? 0;

      const tresRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true })
        .eq("objetivos_seleccionados", 3);
      if (tresRes.error) throw tresRes.error;
      const con_tres_objetivos = tresRes.count ?? 0;

      const dosRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true })
        .eq("objetivos_seleccionados", 2);
      if (dosRes.error) throw dosRes.error;
      const con_dos_objetivos = dosRes.count ?? 0;

      const mesRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true })
        .gte("created_at", since);
      if (mesRes.error) throw mesRes.error;
      const ultimo_mes = mesRes.count ?? 0;

      const por_sede = await porSedeEncuestas(supabase);

      let ranking_autorizados: Awaited<
        ReturnType<typeof rankingAutorizadosDesdeTabla>
      > = [];
      try {
        ranking_autorizados = await rankingAutorizadosDesdeTabla(supabase, 50);
      } catch (ex) {
        console.warn(
          "estadisticas-generales: ranking_autorizados vacío por excepción:",
          ex,
        );
      }

      const bodyOut = {
        ok: true,
        total,
        con_dolor,
        con_trastorno_dormir,
        con_tres_objetivos,
        con_dos_objetivos,
        ultimo_mes,
        por_sede,
        actualizado_en: now.toISOString(),
        ranking_autorizados,
      };

      return jsonResponse(200, bodyOut, origin, {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        "X-WK-Ranking-Autorizados": "1",
      });
    }

    if (path === "/encuestas/listado-filtrado" && method === "GET") {
      const supabase = getSupabase();
      const rawSintomas: string[] = [];
      const sintomasParam = query?.sintomas?.trim();
      if (sintomasParam) {
        const parts = sintomasParam.split(",").map((p) => p.trim()).filter(Boolean);
        for (const s of parts.slice(0, 3)) {
          if (!SINTOMAS_VALIDOS.has(s)) {
            return jsonResponse(
              400,
              errBody(`Síntoma no válido: ${s}`),
              origin,
            );
          }
          rawSintomas.push(s);
        }
      }

      const sedeClean = query?.sede?.trim() || undefined;
      const nombresFrag = safeIlikeFragment(query?.nombres);
      const apellidosFrag = safeIlikeFragment(query?.apellidos);
      const tipoClean = query?.tipo_documento?.trim() || undefined;
      if (tipoClean && !TIPOS_DOC_VALIDOS.has(tipoClean)) {
        return jsonResponse(
          400,
          errBody(`tipo_documento no válido: ${tipoClean}`),
          origin,
        );
      }

      const limit = Math.min(
        2000,
        Math.max(1, parseInt(query?.limit ?? "800", 10) || 800),
      );

      let q = supabase
        .from("wakeup_seguimientos")
        .select(
          "id_int,documento,nombres,apellidos,tipo_documento,sede,sintoma_1,sintoma_2,sintoma_3,created_at,objetivos_seleccionados",
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sedeClean) q = q.eq("sede", sedeClean);
      if (nombresFrag) q = q.ilike("nombres", `%${nombresFrag}%`);
      if (apellidosFrag) q = q.ilike("apellidos", `%${apellidosFrag}%`);
      if (tipoClean) q = q.eq("tipo_documento", tipoClean);

      const res = await q;
      if (res.error) {
        return jsonResponse(
          400,
          errBody({ where: "listado-filtrado", error: res.error.message }),
          origin,
        );
      }

      let rows = (res.data || []) as Row[];
      if (rawSintomas.length) {
        rows = rows.filter((r) => filaCoincideSintomas(r, rawSintomas));
      }

      const totalBaseRes = await supabase
        .from("wakeup_seguimientos")
        .select("id_int", { count: "exact", head: true });
      if (totalBaseRes.error) throw totalBaseRes.error;
      const totalBase = totalBaseRes.count ?? 0;

      return jsonResponse(
        200,
        {
          ok: true,
          rows,
          mostrados: rows.length,
          total_en_base: totalBase,
          filtros: {
            sede: sedeClean ?? null,
            nombres: nombresFrag,
            apellidos: apellidosFrag,
            tipo_documento: tipoClean ?? null,
            sintomas: rawSintomas,
          },
          actualizado_en: new Date().toISOString(),
        },
        origin,
      );
    }
  } catch (e) {
    if (e instanceof HttpErr) {
      return jsonResponse(e.status, errBody(e.message), origin);
    }
    if (e && typeof e === "object" && "message" in e) {
      return jsonResponse(
        400,
        errBody({
          where: "encuestas",
          error: String((e as { message: string }).message),
        }),
        origin,
      );
    }
    throw e;
  }

  return null;
}
