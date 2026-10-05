import { apiUrl } from "../api/baseUrl";

/**
 * Fecha legible para listados de encuestas existentes (tablet/móvil).
 * @param {unknown} iso
 * @returns {string}
 */
export function formatFechaRegistro(iso) {
  if (iso == null || iso === "") return "sin fecha";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/**
 * Línea tipo: "1. Logros 1 — 05/10/2026, 9:15 a. m. · Sede"
 * Preferir tipo_label/numero del API; fallback a etiqueta.
 * @param {Record<string, unknown>} r
 * @returns {string}
 */
export function lineaRegistroExistente(r) {
  if (!r || typeof r !== "object") return "";
  const fecha = formatFechaRegistro(r.created_at);
  const sede = r.sede ? ` · ${String(r.sede).trim()}` : "";
  const tipoLabel =
    String(r.tipo_label || "").trim() ||
    (r.tipo === "logros2"
      ? "Logros 2"
      : r.tipo === "logros1"
        ? "Logros 1"
        : "Encuesta");
  const numero =
    r.numero != null && Number.isFinite(Number(r.numero))
      ? Number(r.numero)
      : null;
  if (numero != null) {
    return `${numero}. ${tipoLabel} — ${fecha}${sede}`;
  }
  const etiqueta = String(r.etiqueta || "").trim();
  if (etiqueta) return `${etiqueta} — ${fecha}${sede}`;
  return `${tipoLabel} — ${fecha}${sede}`;
}

/**
 * @param {unknown} registros
 * @returns {string[]}
 */
export function lineasRegistrosExistentes(registros) {
  if (!Array.isArray(registros)) return [];
  return registros.map(lineaRegistroExistente).filter(Boolean);
}

/**
 * Texto plano para SweetAlert `text` (sin HTML).
 * @param {unknown} registros
 * @param {{ intro?: string }} [opts]
 */
export function buildRegistrosExistentesText(registros, opts = {}) {
  const lines = lineasRegistrosExistentes(registros);
  if (!lines.length) return "";
  const intro =
    opts.intro || "Para este documento ya hay encuestas registradas:";
  return `${intro}\n\n${lines.join("\n")}`;
}

/**
 * HTML seguro (texto escapado) para SweetAlert `html`.
 * @param {unknown} registros
 * @param {{ intro?: string, footnote?: string }} [opts]
 */
export function buildRegistrosExistentesHtml(registros, opts = {}) {
  const lines = lineasRegistrosExistentes(registros);
  if (!lines.length) return "";

  const escape = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const intro =
    opts.intro || "Para este documento ya hay encuestas registradas:";
  const items = lines
    .map(
      (line) =>
        `<li style="margin:0.2rem 0;text-align:left;line-height:1.45">${escape(line)}</li>`,
    )
    .join("");
  const footnote = opts.footnote
    ? `<p style="margin:0.85rem 0 0;text-align:left;font-size:0.92em;opacity:0.92">${escape(opts.footnote)}</p>`
    : "";

  return (
    `<div style="text-align:left">` +
    `<p style="margin:0 0 0.65rem">${escape(intro)}</p>` +
    `<ul style="margin:0;padding-left:0;list-style:none">${items}</ul>` +
    footnote +
    `</div>`
  );
}

/**
 * GET /verificacion/registros/:documento — L1 + L2 (moderno y legado).
 * @param {string|number} documento
 */
export async function fetchRegistrosPorDocumento(documento) {
  const docDigits = String(documento ?? "").replace(/\D/g, "").trim();
  if (!docDigits) {
    return {
      ok: false,
      status: 0,
      documento: "",
      registros: [],
      resumen: [],
      conteo: { logros1: 0, logros2: 0 },
      total: 0,
      detail: "Documento sin dígitos válidos",
    };
  }

  try {
    const res = await fetch(
      apiUrl(`/verificacion/registros/${encodeURIComponent(docDigits)}`),
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof json?.detail === "string"
          ? json.detail
          : "No se pudieron consultar los registros del documento.";
      return {
        ok: false,
        status: res.status,
        documento: docDigits,
        registros: [],
        resumen: [],
        conteo: { logros1: 0, logros2: 0 },
        total: 0,
        detail,
      };
    }

    const registros = Array.isArray(json?.registros) ? json.registros : [];
    const resumen = Array.isArray(json?.resumen)
      ? json.resumen
      : registros.map((r) => r?.etiqueta).filter(Boolean);
    const conteo = {
      logros1: Number(json?.conteo?.logros1) || 0,
      logros2: Number(json?.conteo?.logros2) || 0,
    };

    return {
      ok: true,
      status: res.status,
      documento: String(json?.documento || docDigits),
      registros,
      resumen,
      conteo,
      total: Number(json?.total_registros) || registros.length,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      documento: docDigits,
      registros: [],
      resumen: [],
      conteo: { logros1: 0, logros2: 0 },
      total: 0,
      detail: "No fue posible conectar con el servidor.",
    };
  }
}
