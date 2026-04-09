/**
 * Base de la API HTTP.
 *
 * Producción (build Vite): siempre cadena vacía → rutas relativas al mismo origen
 * (Netlify reescribe `/verificacion`, `/encuestas`, `/autorizados` a Functions).
 * Así no importa si en el panel de Netlify quedó un `VITE_API_URL` antiguo (p. ej. Render).
 *
 * Desarrollo: opcional `VITE_API_URL` (p. ej. Python en :8000 o `netlify dev` vía proxy).
 */
export function getApiBase() {
  if (import.meta.env.PROD) {
    return "";
  }
  const v = import.meta.env.VITE_API_URL;
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s.replace(/\/$/, "");
}

/**
 * @param {string} path Ruta API con o sin "/" inicial (ej. `/verificacion/pin` o `verificacion/pin`).
 */
export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const b = getApiBase();
  return b ? `${b}${p}` : p;
}
