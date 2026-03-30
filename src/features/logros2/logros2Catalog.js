import { OBJETIVOS } from "../../data/encuestaLogrosCatalog";

/** Percepción de evolución respecto al objetivo definido en la evaluación previa. */
export const NIVEL_MEJORA = [
  { value: "mucho", label: "Mejora sustancial" },
  { value: "poco", label: "Mejora leve o parcial" },
  { value: "nada", label: "Sin cambio clínico relevante" },
];

const CUMPLIMIENTO = {
  value: "cumplimiento_objetivo",
  label: "Objetivo alcanzado (cumplimiento del planteado)",
};

/**
 * Opciones del desplegable "nuevo objetivo": mismas que en logros 1 + cumplimiento.
 */
export function getOpcionesNuevoObjetivo(sintomaKey) {
  if (!sintomaKey || sintomaKey === "otro") {
    return [
      CUMPLIMIENTO,
      {
        value: "seguir_plan",
        label: "Continuar intervención según plan establecido",
      },
    ];
  }
  const base = OBJETIVOS[sintomaKey]?.opciones || [];
  return [...base, CUMPLIMIENTO];
}
