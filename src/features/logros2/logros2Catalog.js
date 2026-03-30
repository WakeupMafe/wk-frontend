import { OBJETIVOS } from "../../data/encuestaLogrosCatalog";

/** Nivel de mejora respecto al objetivo planteado en la evaluación anterior. */
export const NIVEL_MEJORA = [
  { value: "mucho", label: "Mejoró mucho" },
  { value: "poco", label: "Mejoró poco" },
  { value: "nada", label: "No mejoró / nada" },
];

const CUMPLIMIENTO = {
  value: "cumplimiento_objetivo",
  label: "Cumplimiento del objetivo planteado",
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
        label: "Seguir trabajando en el plan acordado",
      },
    ];
  }
  const base = OBJETIVOS[sintomaKey]?.opciones || [];
  return [...base, CUMPLIMIENTO];
}
