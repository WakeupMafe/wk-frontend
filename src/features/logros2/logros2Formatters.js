import {
  LIMITACION_MOVERSE,
  ACTIVIDADES_AFECTADAS,
  PROBLEMAS,
  OBJETIVOS,
  ULTIMA_VEZ_OPTIONS,
  QUE_IMPIDE_OPTIONS,
} from "../../data/encuestaLogrosCatalog";

/** @param {unknown} v */
function normStr(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

/**
 * Detecta JSON array serializado y devuelve array de strings; si no, [].
 * @param {unknown} raw
 * @returns {string[]}
 */
export function safeParseJsonArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const j = JSON.parse(t);
        return Array.isArray(j)
          ? j.map((x) => String(x).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }
    return [t];
  }
  return [];
}

/**
 * Lista legible a partir de valores de catálogo.
 * @param {string[]} values
 * @param {{ value: string, label: string }[]} catalog
 */
export function toHumanList(values, catalog) {
  if (!values?.length) return "—";
  return values
    .map((v) => catalog.find((a) => a.value === v)?.label || humanizeToken(v))
    .join(", ");
}

function humanizeToken(s) {
  if (!s) return "";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFechaEvaluacion(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** @deprecated use safeParseJsonArray */
export function parseActividadesAfectadas(raw) {
  return safeParseJsonArray(raw);
}

export function labelLimitacion(value) {
  const o = LIMITACION_MOVERSE.find((x) => x.value === value);
  return o?.label || humanizeToken(normStr(value)) || "—";
}

/** Texto narrativo (concordancia con «limitación» femenina). */
export function labelLimitacionNarrativa(value) {
  if (value === "poco") return "poca";
  return labelLimitacion(value);
}

export function labelsActividades(values) {
  return toHumanList(safeParseJsonArray(values), ACTIVIDADES_AFECTADAS);
}

export function labelsQueImpide(raw) {
  return toHumanList(safeParseJsonArray(raw), QUE_IMPIDE_OPTIONS);
}

export function mapLastTimeLabel(value) {
  const o = ULTIMA_VEZ_OPTIONS.find((x) => x.value === value);
  return o?.label || humanizeToken(normStr(value)) || "—";
}

/** Etiqueta legible de síntoma (catálogo PROBLEMAS). */
export function mapSymptomLabel(value) {
  const v = normStr(value);
  if (!v) return "—";
  const o = PROBLEMAS.find((p) => p.value === v);
  return o?.label || humanizeToken(v);
}

/**
 * Texto de objetivo acordado en Fase 1 a partir de clave de catálogo.
 * @param {string} sintomaKey
 * @param {string} objetivoValue
 */
export function mapGoalLabel(sintomaKey, objetivoValue) {
  const ov = normStr(objetivoValue);
  if (!ov) return "";
  const opts = OBJETIVOS[sintomaKey]?.opciones || [];
  const o = opts.find((x) => x.value === ov);
  return o?.label || humanizeToken(ov);
}

/** Compatibilidad con imports previos */
export function labelProblema(value) {
  return mapSymptomLabel(value);
}

export function labelObjetivoPrevio(sintomaKey, objetivoValue) {
  const t = mapGoalLabel(sintomaKey, objetivoValue);
  return t || "—";
}

/**
 * Reparte objetivos huérfanos (filas antiguas con columnas comprimidas) a síntomas sin objetivo.
 * @param {Record<string, unknown>} row
 */
function healObjectiveAlignment(row) {
  /** @type {{ column: number, sintoma: string, objetivo: string }[]} */
  const assignments = [];
  for (let i = 1; i <= 3; i++) {
    const sintoma = normStr(row[`sintoma_${i}`]);
    if (!sintoma) continue;
    assignments.push({
      column: i,
      sintoma,
      objetivo: normStr(row[`objetivo_${i}`]),
    });
  }
  if (assignments.length === 0) return [];

  const claimed = new Set();
  for (let j = 1; j <= 3; j++) {
    const sin = normStr(row[`sintoma_${j}`]);
    const obj = normStr(row[`objetivo_${j}`]);
    if (sin && obj) claimed.add(obj);
  }

  const pool = [];
  for (let j = 1; j <= 3; j++) {
    const obj = normStr(row[`objetivo_${j}`]);
    if (!obj || claimed.has(obj)) continue;
    pool.push(obj);
  }

  for (const a of assignments) {
    if (!a.objetivo && pool.length) {
      a.objetivo = pool.shift() || "";
    }
  }

  return assignments;
}

/**
 * @typedef {object} Logros2Slot
 * @property {number} slot
 * @property {string} sintoma
 * @property {string} objetivoPrevioKey
 * @property {string} objetivoPrevioLabel
 * @property {'select'|'text'} inputMode
 */

/**
 * Construye ítems de seguimiento desde fila Logros Fase 1.
 * @param {Record<string, unknown>} row
 * @returns {Logros2Slot[]}
 */
export function buildSlotsFromFase1(row) {
  if (!row || typeof row !== "object") return [];

  const healed = healObjectiveAlignment(row);
  const extraGlobal = normStr(row.objetivo_extra);

  /** @type {Logros2Slot[]} */
  const out = [];
  let idx = 0;

  for (const h of healed) {
    idx += 1;
    const sintoma = h.sintoma;
    const key = h.objetivo;
    let label = mapGoalLabel(sintoma, key);
    if (!label && key) label = humanizeToken(key);
    if (!label && sintoma === "otro" && extraGlobal) label = extraGlobal;
    if (!label && extraGlobal && healed.length === 1) label = extraGlobal;
    if (!label && sintoma === "otro") {
      const otroTxt = normStr(row.otro_sintoma);
      if (otroTxt) label = otroTxt;
    }
    if (!label) label = "—";

    const inputMode =
      sintoma === "otro" && !normStr(key) ? "text" : "select";

    out.push({
      slot: idx,
      sintoma,
      objetivoPrevioKey: key,
      objetivoPrevioLabel: label,
      inputMode,
      otroSintomaText: sintoma === "otro" ? normStr(row.otro_sintoma) : "",
      metaComplementaria: extraGlobal || "",
    });
  }

  return out;
}

/**
 * Fila Fase 1 normalizada para UI (parseo seguro de JSON desde Postgres).
 * @param {Record<string, unknown>} row
 */
export function normalizeFase1Row(row) {
  if (!row) return row;
  return {
    ...row,
    actividades_afectadas: safeParseJsonArray(row.actividades_afectadas),
    que_impide: safeParseJsonArray(row.que_impide),
  };
}
