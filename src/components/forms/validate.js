import {
  PATOLOGIA_RELACIONADA,
  PROBLEMAS_CON_ACLARACION,
  objetivoRequiereMinutos,
  objetivoRequiereHoras,
  objetivoRequiereTextoObjetivo,
  textoObjetivoFormKey,
  isObjetivoSoloLimitacionPoca,
} from "../../data/encuestaLogrosCatalog";

const PATOLOGIA_RELACIONADA_VALUES = new Set(
  PATOLOGIA_RELACIONADA.map((o) => o.value),
);

/**
 * @param {string} tipo
 * @param {string} doc
 * @returns {string | null} mensaje de error o null si OK
 */
export function validateDocumentoPorTipo(tipo, doc) {
  const t = (tipo || "").trim();
  const d = (doc || "").trim();
  if (!d) return "Digite el documento.";

  if (t === "registro_civil" || t === "pasaporte") {
    const cleaned = d.replace(/[^A-Za-z0-9\-]/g, "");
    if (cleaned.length < 5) {
      return "Entre 5 y 30 caracteres (letras, números o guion).";
    }
    if (cleaned.length > 30) {
      return "Máximo 30 caracteres.";
    }
    return null;
  }

  // Cédula, TI, CE: solo números, 6–11 dígitos
  if (!/^\d+$/.test(d)) {
    return "Solo números (sin espacios ni letras).";
  }
  if (d.length < 6) return "Debe tener mínimo 6 dígitos.";
  if (d.length > 11) return "Debe tener máximo 11 dígitos.";
  return null;
}

export function validateEncuestaLogros(form, objetivosAResponder) {
  const nextErrors = {};

  if (!form.nombres.trim()) nextErrors.nombres = "Campo requerido.";
  if (!form.apellidos.trim()) nextErrors.apellidos = "Campo requerido.";

  if (!form.tipoDocumento) {
    nextErrors.tipoDocumento = "Seleccione un tipo de documento.";
  }

  const errDoc = validateDocumentoPorTipo(form.tipoDocumento, form.documento);
  if (errDoc) nextErrors.documento = errDoc;

  const zonas = Array.isArray(form.patologiasTop) ? form.patologiasTop : [];
  if (zonas.length < 1) {
    nextErrors.patologiasTop =
      "Seleccione al menos 1 zona (prioritaria). Máximo 3.";
  } else if (zonas.length > 3) {
    nextErrors.patologiasTop =
      "Máximo 3 zonas (prioritaria, secundaria y terciaria).";
  } else if (zonas.some((z) => !PATOLOGIA_RELACIONADA_VALUES.has(z))) {
    nextErrors.patologiasTop = "Hay una zona no válida en la selección.";
  }

  if (zonas.includes("otro") && !String(form.otraPatologia || "").trim()) {
    nextErrors.otraPatologia =
      "Especifique la otra zona (ej. inguinal, pubis, dorsal).";
  }

  if (!form.limitacionMoverse) {
    nextErrors.limitacionMoverse = "Seleccione una opción.";
  }

  if (form.problemasTop.length < 1) {
    nextErrors.problemasTop = "Debe seleccionar mínimo 1 problema.";
  }

  if (form.problemasTop.length > 3) {
    nextErrors.problemasTop = "Máximo 3 problemas.";
  }

  if (form.problemasTop.includes("otro") && !form.otroProblema.trim()) {
    nextErrors.otroProblema = "Especifique el otro problema.";
  }

  for (const problema of form.problemasTop) {
    if (!PROBLEMAS_CON_ACLARACION.has(problema)) continue;
    if (!String(form.textos?.[problema] || "").trim()) {
      nextErrors[`texto_${problema}`] =
        "Describa brevemente cómo le afecta este problema.";
    }
  }

  for (const problema of objetivosAResponder) {
    const obj = form.objetivos[problema];
    if (!obj) {
      nextErrors[`obj_${problema}`] = "Seleccione un objetivo.";
    } else if (
      isObjetivoSoloLimitacionPoca(problema, obj) &&
      form.limitacionMoverse !== "poco"
    ) {
      nextErrors[`obj_${problema}`] =
        "Esa opción solo aplica si la limitación para moverse es «Poco».";
    } else if (objetivoRequiereMinutos(problema, obj)) {
      if (!String(form.objetivosMinutos?.[problema] || "").trim()) {
        nextErrors[`obj_min_${problema}`] = "Seleccione los minutos.";
      }
    } else if (objetivoRequiereHoras(problema, obj)) {
      if (!String(form.objetivosHoras?.[problema] || "").trim()) {
        nextErrors[`obj_hor_${problema}`] = "Seleccione las horas.";
      }
    }

    if (objetivoRequiereTextoObjetivo(problema, obj)) {
      const textoKey = textoObjetivoFormKey(problema);
      if (!String(form.textos?.[textoKey] || "").trim()) {
        nextErrors[`texto_obj_${problema}`] =
          problema === "limitacion_deporte"
            ? "Indique qué ejercicio."
            : problema === "autocuidado"
              ? "Indique en qué actividad necesita esa ayuda."
              : "Indique el tipo de actividades.";
      }
    }
  }

  if (form.adicionalNoPuede.trim()) {
    if (!form.ultimaVez) {
      nextErrors.ultimaVez = "Seleccione una opción.";
    }

    if (form.queImpide.length < 1) {
      nextErrors.queImpide = "Seleccione al menos una opción.";
    }
  }

  return nextErrors;
}
