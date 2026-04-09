/** Orígenes permitidos (equivalente a CORSMiddleware en `backend/main.py`). */
const ALLOW_ORIGINS = new Set([
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "https://wkseguimientos.netlify.app",
  "https://www.wkseguimientos.netlify.app",
]);

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function pickCorsOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null;
  if (ALLOW_ORIGINS.has(requestOrigin)) return requestOrigin;
  if (LOCAL_ORIGIN_RE.test(requestOrigin)) return requestOrigin;
  return null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (origin) {
    base["Access-Control-Allow-Origin"] = origin;
    base["Access-Control-Allow-Credentials"] = "true";
  }
  return base;
}
