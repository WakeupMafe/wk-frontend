/**
 * Helpers de documento de paciente (L1/L2/L3 / estadísticas).
 * Espejo de limpiarDocumentoPaciente / validateDocumentoPorTipo:
 * - pasaporte / registro_civil: alfanumérico + guion, mayúsculas
 * - cédula / TI / CE: solo dígitos
 * En búsqueda sin tipo: si hay letras → alfanumérico; si no → dígitos.
 */

/**
 * @param {unknown} raw
 * @param {string|null|undefined} [tipoDocumento]
 * @returns {string}
 */
export function limpiarDocumentoPaciente(raw, tipoDocumento) {
  const t = String(tipoDocumento ?? "")
    .trim()
    .toLowerCase();
  let d = String(raw ?? "").trim();

  if (t === "registro_civil" || t === "pasaporte") {
    return d.replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
  }

  if (t) {
    return d.replace(/\D/g, "");
  }

  // Sin tipo (búsqueda libre): conservar alfanumérico si hay letras/guion no numérico
  if (/[A-Za-z]/.test(d) || (d.includes("-") && /[A-Za-z0-9]/.test(d))) {
    return d.replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
  }
  return d.replace(/\D/g, "");
}

/**
 * @param {string} doc — ya limpio
 * @param {string|null|undefined} [tipoDocumento]
 * @returns {boolean}
 */
export function esDocumentoPacienteValido(doc, tipoDocumento) {
  const d = String(doc ?? "").trim();
  if (!d) return false;
  const t = String(tipoDocumento ?? "")
    .trim()
    .toLowerCase();

  if (t === "registro_civil" || t === "pasaporte") {
    return d.length >= 5 && d.length <= 30;
  }
  if (t) {
    return /^\d+$/.test(d) && d.length >= 6 && d.length <= 11;
  }
  if (/[A-Za-z]/.test(d) || d.includes("-")) {
    return d.length >= 5 && d.length <= 30;
  }
  return /^\d+$/.test(d) && d.length >= 6;
}

/**
 * @param {unknown} doc
 * @param {string|null|undefined} [tipoHint]
 * @returns {string}
 */
export function inferTipoDocumentoPaciente(doc, tipoHint) {
  const t = String(tipoHint ?? "")
    .trim()
    .toLowerCase();
  if (t) return t;
  const d = String(doc ?? "");
  if (/[A-Za-z]/.test(d) || (d.includes("-") && !/^\d+$/.test(d))) {
    return "pasaporte";
  }
  return "cedula";
}

/**
 * Mínimo para autocompletar búsqueda paciente: ≥4 letras (nombre) o
 * documento (≥5 dígitos / ≥5 alfanumérico tipo pasaporte).
 * @param {string} q
 * @returns {boolean}
 */
export function busquedaPacienteCumpleMinimo(q) {
  const s = String(q ?? "").trim();
  if (!s) return false;
  const digitos = s.replace(/\D/g, "").length;
  const letras = s.replace(/[^\p{L}]/gu, "").length;
  const alphanum = s.replace(/[^A-Za-z0-9\-]/g, "");
  const pareceDocAlfanum =
    /[A-Za-z]/.test(alphanum) && alphanum.length >= 5;
  return letras >= 4 || digitos >= 5 || pareceDocAlfanum;
}
