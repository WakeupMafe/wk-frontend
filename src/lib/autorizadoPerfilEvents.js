/** Evento tras guardar sede/correo en perfil (misma pestaña). */
export const WK_PERFIL_ACTUALIZADO = "wk-perfil-actualizado";

export function emitPerfilActualizado(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WK_PERFIL_ACTUALIZADO, { detail }));
}

export function readAutorizadoCache() {
  try {
    const raw = sessionStorage.getItem("wk_autorizado");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
