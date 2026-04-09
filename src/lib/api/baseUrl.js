/**
 * Base de la API HTTP.
 * - Vacío / no definido: mismo origen (Netlify: rewrites a functions).
 * - Valor explícito: backend remoto o `http://127.0.0.1:8000` (Python local), etc.
 */
export function getApiBase() {
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
