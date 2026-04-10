import { OBJETIVOS } from "../../data/encuestaLogrosCatalog";
import { mapGoalLabel } from "./logros2Formatters";

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
  const opts = OBJETIVOS[sintomaKey]?.opciones || [];
  const base = [...opts];
  const pk = String(objetivoPrevioKey || "").trim();
  if (pk && !base.some((o) => o.value === pk)) {
    const lbl = mapGoalLabel(sintomaKey, pk);
    base.unshift({
      value: pk,
      label: lbl && lbl !== "—" ? lbl : pk,
    });
  }
  return [...base, CUMPLIMIENTO];
}
