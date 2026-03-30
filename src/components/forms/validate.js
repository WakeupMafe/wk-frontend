export function validateEncuestaLogros(form, objetivosAResponder) {
  const nextErrors = {};

  if (!form.nombres.trim()) nextErrors.nombres = "Campo requerido.";
  if (!form.apellidos.trim()) nextErrors.apellidos = "Campo requerido.";

  if (!form.tipoDocumento) {
    nextErrors.tipoDocumento = "Seleccione un tipo de documento.";
  }

  if (!form.documento) {
    nextErrors.documento = "Digite el documento.";
  } else {
    // Cédula, TI y CE en Colombia: 6–11 dígitos (NUIP / formatos recientes).
    if (form.documento.length < 6) {
      nextErrors.documento = "Debe tener mínimo 6 dígitos.";
    }
    if (form.documento.length > 11) {
      nextErrors.documento = "Debe tener máximo 11 dígitos.";
    }
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
