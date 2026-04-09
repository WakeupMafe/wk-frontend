import Swal from "sweetalert2";
import "../../components/SweetAlert.css";

function isLocalApiUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function fetchRootWithTimeout(baseUrl, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(`${baseUrl.replace(/\/$/, "")}/`, {
    method: "GET",
    signal: controller.signal,
  }).finally(() => clearTimeout(id));
}

const MS_FIRST = 90_000;
const MS_RETRY = 60_000;

/** Compartido entre pestañas del mismo origen. */
const STORAGE_KEY = "wk_backend_warmup";
/** Si no hubo un warmup OK en este tiempo, se vuelve a mostrar el modal. */
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** Clave antigua (sessionStorage); se limpia al migrar. */
const LEGACY_SESSION_KEY = "wk_backend_warmup_ok";

function readWarmTimestamp() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const t = data?.t;
    if (typeof t !== "number" || Number.isNaN(t)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - t > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

function writeWarmNow() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now() }));
  } catch {
    /* cuota / modo privado */
  }
}

function clearWarm() {
  try {
    localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function migrateLegacySessionStorage() {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(LEGACY_SESSION_KEY) === "1") {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      writeWarmNow();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Primera petición al backend: en producción muestra modal + reintento (cold start Render).
 * Tras un warmup OK, todas las pestañas comparten estado (localStorage): recargas y nuevas pestañas
 * hacen ping silencioso sin modal; si falla, se limpia y se muestra el modal otra vez.
 * En localhost: solo intenta en silencio, sin modal.
 */
export async function warmupBackend(apiBaseUrl) {
  const base = String(apiBaseUrl || "").trim() || "http://127.0.0.1:8000";

  if (isLocalApiUrl(base)) {
    try {
      await fetchRootWithTimeout(base, 15_000);
    } catch {
      /* desarrollo: sin modal ni alerta */
    }
    return { ok: true, retried: false };
  }

  migrateLegacySessionStorage();

  if (readWarmTimestamp() !== null) {
    try {
      await fetchRootWithTimeout(base, 20_000);
      writeWarmNow();
      return { ok: true, retried: false };
    } catch {
      clearWarm();
    }
  }

  Swal.fire({
    title: "Estamos conectando los servidores",
    html: `
      <p style="margin:0.35em 0 0.65em;font-size:1.05rem;line-height:1.45;">
        Se encuentran <strong>dormidos</strong> cuando llevan un tiempo sin uso; necesitan unos segundos para volver a estar listos.
      </p>
      <p style="margin:0.65em 0 0;opacity:0.9;font-size:1rem;line-height:1.45;">
        Espera un momento…
      </p>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  const attempt = async (timeoutMs) => {
    const res = await fetchRootWithTimeout(base, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  try {
    await attempt(MS_FIRST);
    writeWarmNow();
    Swal.close();
    return { ok: true, retried: false };
  } catch {
    Swal.update({
      title: "Reintentando conexión",
      html: `
        <p style="margin:0.35em 0 0.65em;font-size:1.05rem;line-height:1.45;">
          El primer intento tardó demasiado; los servidores aún pueden estar despertando.
        </p>
        <p style="margin:0.65em 0 0;opacity:0.9;font-size:1rem;line-height:1.45;">
          Hacemos un <strong>segundo intento automático</strong>. Espera un momento…
        </p>
      `,
    });
    Swal.showLoading();
    try {
      await attempt(MS_RETRY);
      writeWarmNow();
      Swal.close();
      return { ok: true, retried: true };
    } catch (e2) {
      Swal.close();
      return { ok: false, retried: true, error: e2 };
    }
  }
}
