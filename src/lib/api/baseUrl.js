/**
 * Base de la API HTTP.
 *
 * Producción (build Vite): siempre "" → rutas relativas al mismo origen (Netlify rewrites).
 *
 * Desarrollo:
 * - Recomendado: `npx netlify dev` desde la raíz del repo y abrir la URL que muestra la CLI
 *   (mismo origen para React y Functions). Deja VITE_API_URL sin definir.
 * - Solo `npm run dev` (Vite :5173): sin proxy a Functions; define VITE_API_URL si la API
 *   corre en otro sitio (p. ej. http://127.0.0.1:8000 para el backend Python).
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
