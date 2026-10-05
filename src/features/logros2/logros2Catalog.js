import {
  OBJETIVOS,
  parseObjetivoValue,
  formatObjetivoLabel,
} from "../../data/encuestaLogrosCatalog";
import { mapGoalLabel } from "./logros2Formatters";

/** Objetivos de Logros 1 retirados pero válidos en seguimiento Logros 2. */
const LOGROS2_OBJETIVOS_EXTRA = {
  limitacion_deporte: [
    {
      value: "deporte_preferencia",
      label:
        "Poder practicar el deporte de mi preferencia (trote, pádel, tenis, fútbol, pilates)",
    },
  ],
  vida_social: [
    {
      value: "cumple_familia",
      label:
        "Poder asistir a cumpleaños o actividades familiares de leve exigencia física",
    },
    {
      value: "misa_1h",
      label:
        "Poder ir a misa o reuniones religiosas de 1 hora o más de duración",
    },
    {
      value: "eventos_2h",
      label:
        "Poder ir a cine, partidos o conciertos (2+ horas) con alta demanda física",
    },
  ],
  dormir: [
    { value: "sin_dificultad", label: "Dormir sin dificultad" },
  ],
};

/** Percepción de evolución respecto al objetivo definido en la evaluación previa. */
export const NIVEL_MEJORA = [
  { value: "mucho", label: "Mejora sustancial" },
  { value: "poco", label: "Mejora leve o parcial" },
  { value: "nada", label: "Sin cambio clínico relevante" },
  { value: "desmejoria", label: "Desmejoría" },
];

const CUMPLIMIENTO = {
  value: "cumplimiento_objetivo",
  label: "Objetivo alcanzado (cumplimiento del planteado)",
};

/**
 * Opciones del desplegable «Objetivo de seguimiento o a establecer»:
 * catálogo Logros 1 + cumplimiento; incluye el objetivo previo si no estaba en la lista.
 * @param {string} sintomaKey
 * @param {string} [objetivoPrevioKey]
 */
export function getOpcionesNuevoObjetivo(sintomaKey, objetivoPrevioKey) {
  if (!sintomaKey || sintomaKey === "otro") {
    const base = [
      CUMPLIMIENTO,
      {
        value: "seguir_plan",
        label: "Continuar intervención según plan establecido",
      },
    ];
    const pk = String(objetivoPrevioKey || "").trim();
    if (pk && !base.some((o) => o.value === pk)) {
      base.unshift({
        value: pk,
        label: mapGoalLabel("otro", pk) || pk,
      });
    }
    return base;
  }
  const opts = (OBJETIVOS[sintomaKey]?.opciones || []).map(({ value, label }) => ({
    value,
    label,
  }));
  const extras = (LOGROS2_OBJETIVOS_EXTRA[sintomaKey] || []).map(
    ({ value, label }) => ({ value, label }),
  );
  const base = [...opts, ...extras.filter((e) => !opts.some((o) => o.value === e.value))];
  const pk = String(objetivoPrevioKey || "").trim();
  const { value: pkBase } = parseObjetivoValue(pk);
  if (pk && !base.some((o) => o.value === pk)) {
    const lbl =
      formatObjetivoLabel(sintomaKey, pk) ||
      mapGoalLabel(sintomaKey, pk);
    // Objetivo previo con minutos (base@N) o legado no listado.
    if (pk !== pkBase || !base.some((o) => o.value === pkBase)) {
      base.unshift({
        value: pk,
        label: lbl && lbl !== "—" ? lbl : pk,
      });
    }
  }
  return [...base, CUMPLIMIENTO];
}
