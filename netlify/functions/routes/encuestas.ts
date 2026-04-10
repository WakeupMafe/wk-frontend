import type { HandlerResponse } from "@netlify/functions";
import { getSupabase } from "../_lib/supabase";
import { jsonResponse } from "../_lib/http";

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

  const supabase = getSupabase();

  const yaExiste = await supabase
    .from("wakeup_seguimientos")
    .select("id_int")
    .eq("documento", docPaciente)
    .limit(1)
    .maybeSingle();

  if (yaExiste.error) {
    return jsonResponse(
      400,
      errBody({ where: "SUPABASE SELECT DUP", error: yaExiste.error.message }),
      origin,
    );
  }
  if (yaExiste.data) {
    return jsonResponse(
      409,
      errBody(
        "Este usuario ya tiene encuesta. No es posible realizar otra encuesta.",
      ),
      origin,
    );
  }

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

  return jsonResponse(200, { ok: true, data: res.data }, origin);
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
    if (!String(it.nuevo_objetivo ?? "").trim()) {
      return jsonResponse(
        400,
        errBody(`Indique el nuevo objetivo para el síntoma ${slot}.`),
        origin,
      );
    }
  }

  const idEncuestaFase1 = Number(data.id_encuesta_fase1);
  if (!Number.isFinite(idEncuestaFase1)) {
    return jsonResponse(400, errBody("id_encuesta_fase1 inválido"), origin);
  }

  const supabase = getSupabase();

  const check = await supabase
    .from("wakeup_seguimientos")
    .select("id_int, documento")
    .eq("id_int", idEncuestaFase1)
    .limit(1)
    .maybeSingle();

  if (check.error) {
    return jsonResponse(
      400,
      errBody({ where: "SUPABASE SELECT FASE1", error: check.error.message }),
      origin,
    );
  }
  if (!check.data) {
    return jsonResponse(
      404,
      errBody("No se encontró la encuesta de logros (fase 1) indicada."),
      origin,
    );
  }

  const docF1 = check.data.documento;
  if (
    docF1 != null &&
    String(docF1).trim() !== String(docPaciente).trim()
  ) {
    return jsonResponse(
      400,
      errBody("El documento no coincide con la encuesta base."),
      origin,
    );
  }

  const respuestas = items.map((it) => ({
    slot: it.slot,
    sintoma: it.sintoma,
    nivel_mejora: it.nivel_mejora,
    nuevo_objetivo: it.nuevo_objetivo,
  }));

  const documentoVal = /^\d+$/.test(docPaciente)
    ? parseInt(docPaciente, 10)
    : docPaciente;
  const encuestadorVal = /^\d+$/.test(docEncuestador)
    ? parseInt(docEncuestador, 10)
    : docEncuestador;

  const insertRow = {
    documento: documentoVal,
    encuestador: encuestadorVal,
    sede: sedeClean,
    id_encuesta_fase1: idEncuestaFase1,
    respuestas,
  };

  const res = await supabase
    .from("wakeup_seguimientos_logros2")
    .insert(insertRow)
    .select();

  if (res.error) {
    return jsonResponse(
      400,
      errBody({
        where: "SUPABASE INSERT LOGROS2",
        error: res.error.message,
        row: insertRow,
      }),
      origin,
    );
  }

  return jsonResponse(200, { ok: true, data: res.data }, origin);
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
        id_int: r.id_int,
        documento: r.documento,
        nombres: r.nombres,
        apellidos: r.apellidos,
      }));
      console.log(`${LOG} primeros=`, JSON.stringify(preview));

      rowsRaw.sort((a, b) => {
        const ta = String(a.created_at ?? "");
        const tb = String(b.created_at ?? "");
        return tb.localeCompare(ta);
      });

      const out = rowsRaw.slice(0, maxResults);

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
        .select("id_int")
        .eq("documento", docPaciente)
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
        { ok: true, exists: !!res.data },
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
