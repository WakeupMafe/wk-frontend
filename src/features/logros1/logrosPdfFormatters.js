export const LIMITACION_LABELS = {
  mucho: "Mucho",
  bastante: "Bastante",
  poco: "Poco",
  nada: "Nada",
};

export const ULTIMA_VEZ_LABELS = {
  "1_2_meses": "1 a 2 meses",
  "3_6_meses": "3 a 6 meses",
  "7_12_meses": "7 a 12 meses",
  mas_1_ano: "Más de un año",
};

export const QUE_IMPIDE_LABELS = {
  dolor: "Dolor",
  miedo: "Miedo a moverse o lastimarse",
  debilidad: "Debilidad",
};

export const ACTIVIDADES_LABELS = {
  tareas_hogar: "Tareas del hogar",
  autocuidado: "Autocuidado",
  laborales: "Laborales",
  vida_social: "Vida social o familiar",
  ocio: "Ocio",
  ejercicio: "Ejercicio",
};

export function formatLimitacion(value) {
  return LIMITACION_LABELS[value] || value || "-";
}

export function formatUltimaVez(value) {
  return ULTIMA_VEZ_LABELS[value] || value || "-";
}

export function formatQueImpide(value) {
  if (!value) return "-";

  if (Array.isArray(value)) {
    return value.map((item) => QUE_IMPIDE_LABELS[item] || item).join(" - ");
  }

  return QUE_IMPIDE_LABELS[value] || value;
}

export function formatActividades(values) {
  if (!values || !values.length) return "-";
  return values.map((item) => ACTIVIDADES_LABELS[item] || item).join(" - ");
}
