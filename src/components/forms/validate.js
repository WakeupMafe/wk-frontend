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

  for (const problema of objetivosAResponder) {
    if (!form.objetivos[problema]) {
      nextErrors[`obj_${problema}`] = "Seleccione un objetivo.";
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
