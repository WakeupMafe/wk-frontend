import {
  LIMITACION_MOVERSE,
  ACTIVIDADES_AFECTADAS,
  PROBLEMAS,
  OBJETIVOS,
} from "../../data/encuestaLogrosCatalog";

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

export function parseActividadesAfectadas(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function labelLimitacion(value) {
  const o = LIMITACION_MOVERSE.find((x) => x.value === value);
  return o?.label || value || "—";
}

/** Texto para el resumen clínico: concuerda en femenino con «limitación» (p. ej. poca). */
export function labelLimitacionNarrativa(value) {
  if (value === "poco") return "poca";
  return labelLimitacion(value);
}

export function labelsActividades(values) {
  const arr = parseActividadesAfectadas(values);
  if (arr.length === 0) return "—";
  return arr
    .map((v) => ACTIVIDADES_AFECTADAS.find((a) => a.value === v)?.label || v)
    .join(", ");
}

export function labelProblema(value) {
  const o = PROBLEMAS.find((p) => p.value === value);
  return o?.label || value || "—";
}

export function labelObjetivoPrevio(sintomaKey, objetivoValue) {
  if (!objetivoValue) return "—";
  const opts = OBJETIVOS[sintomaKey]?.opciones || [];
  const o = opts.find((x) => x.value === objetivoValue);
  return o?.label || objetivoValue;
}

export function buildSlotsFromFase1(row) {
  const slots = [];
  for (let i = 1; i <= 3; i++) {
    const sintoma = row[`sintoma_${i}`];
    const objetivo = row[`objetivo_${i}`];
    if (!sintoma) continue;
    slots.push({
      slot: i,
      sintoma,
      objetivoPrevio: objetivo || "",
    });
  }
  return slots;
}
