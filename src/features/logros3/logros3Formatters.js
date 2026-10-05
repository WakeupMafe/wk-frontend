/**
 * Formateadores y slots para Encuesta Logros 3 (basada en Logros 2).
 * Reutiliza etiquetas de catálogo vía logros2Formatters.
 */

import {
  formatFechaEvaluacion,
  mapSymptomLabel,
  mapGoalLabel,
  safeParseJsonArray,
} from "../logros2/logros2Formatters";

export { formatFechaEvaluacion, mapSymptomLabel, mapGoalLabel };

/** @param {unknown} v */
function normStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * @typedef {object} Logros3Slot
 * @property {number} slot
 * @property {string} sintoma
 * @property {string} objetivoPrevioKey
 * @property {string} objetivoPrevioLabel
 * @property {'select'|'text'} inputMode
 * @property {string} [otroSintomaText]
 * @property {string} [sintomaLabel]
 */

/**
 * Normaliza fila Logros 2 (moderna o con items embebidos) para la UI de L3.
 * @param {Record<string, unknown>} row
 */
export function normalizeLogros2Row(row) {
  if (!row || typeof row !== "object") return row;
  const itemsRaw =
    row.items ?? row.payload_respuesta ?? row.respuestas ?? [];
  let items = [];
  if (Array.isArray(itemsRaw)) {
    items = itemsRaw;
  } else if (typeof itemsRaw === "string") {
    try {
      const p = JSON.parse(itemsRaw);
      items = Array.isArray(p) ? p : [];
    } catch {
      items = [];
    }
  }
  return {
    ...row,
    items: items.filter((x) => x && typeof x === "object"),
  };
}

/**
 * Construye ítems de seguimiento L3 desde una encuesta Logros 2.
 * El «objetivo previo» es el objetivo_seguimiento / nuevo_objetivo de L2.
 * @param {Record<string, unknown>} row
 * @returns {Logros3Slot[]}
 */
export function buildSlotsFromLogros2(row) {
  const normalized = normalizeLogros2Row(row);
  const items = Array.isArray(normalized?.items) ? normalized.items : [];
  if (!items.length) return [];

  /** @type {Logros3Slot[]} */
  const out = [];
  let idx = 0;

  for (const it of items) {
    idx += 1;
    const sintoma = normStr(
      it.sintoma ?? it.sintoma_codigo ?? it.sintomaCodigo ?? "",
    );
    const sintomaLabelRaw = normStr(it.sintoma_label ?? it.sintomaLabel ?? "");
    const key = normStr(
      it.nuevo_objetivo ??
        it.objetivo_seguimiento ??
        it.objetivoSeguimiento ??
        "",
    );
    let label =
      mapGoalLabel(sintoma, key) ||
      (key ? key : "") ||
      sintomaLabelRaw ||
      "—";
    if (!label) label = "—";

    const inputMode =
      sintoma === "otro" && !key ? "text" : sintoma === "otro" ? "text" : "select";

    out.push({
      slot: Number(it.slot ?? it.orden ?? idx) || idx,
      sintoma: sintoma || "otro",
      objetivoPrevioKey: key,
      objetivoPrevioLabel: label,
      inputMode: sintoma && sintoma !== "otro" ? "select" : inputMode,
      otroSintomaText:
        sintoma === "otro"
          ? normStr(it.otro_sintoma_text ?? sintomaLabelRaw)
          : "",
      sintomaLabel: sintomaLabelRaw || mapSymptomLabel(sintoma),
    });
  }

  // Reindexar slots 1..n para el formulario
  return out.map((s, i) => ({ ...s, slot: i + 1 }));
}

/**
 * Etiqueta legible de una fila Logros 2 para el selector.
 * @param {Record<string, unknown>} r
 */
export function etiquetaLogros2Opcion(r) {
  const codigo = normStr(r.codigo_seguimiento ?? r.codigo ?? "");
  const fecha = formatFechaEvaluacion(r.created_at);
  const sede = normStr(r.sede);
  const nom = `${normStr(r.nombres)} ${normStr(r.apellidos)}`.trim();
  const parts = [];
  if (codigo) parts.push(codigo);
  else parts.push("Logros 2");
  if (fecha) parts.push(fecha);
  if (nom) parts.push(nom);
  if (sede) parts.push(sede);
  return parts.join(" · ");
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function safeParseJsonArrayLocal(raw) {
  return safeParseJsonArray(raw);
}
