import Swal from "sweetalert2";
import "../../components/SweetAlert.css";
import { apiUrl, getApiBase } from "./baseUrl";

const WARMUP_SECONDS = 70;
const MS_FIRST = WARMUP_SECONDS * 1000;
const MS_RETRY = WARMUP_SECONDS * 1000;

const COUNTDOWN_ID = "wk-warmup-countdown";

function isLocalApiUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function fetchPinTestWithTimeout(url, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    method: "GET",
    signal: controller.signal,
  }).finally(() => clearTimeout(id));
}

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

function warmupHtml(secondParagraph) {
  return `
      <p style="margin:0.35em 0 0.65em;font-size:1.05rem;line-height:1.45;">
        Se encuentran <strong>dormidos</strong> cuando llevan un tiempo sin uso; necesitan unos segundos para volver a estar listos.
      </p>
      <p style="margin:0.65em 0 0;opacity:0.9;font-size:1rem;line-height:1.45;">
        ${secondParagraph}
      </p>
      <p
        id="${COUNTDOWN_ID}"
        style="margin:0.85em 0 0;font-size:1.5rem;font-weight:600;letter-spacing:0.02em;color:#3085d6;line-height:1.2;"
        aria-live="polite"
        aria-atomic="true"
      >
        ${WARMUP_SECONDS}
      </p>
      <p style="margin:0.2em 0 0;opacity:0.8;font-size:0.95rem;">segundos restantes</p>
    `;
}

/**
 * Cuenta atrás de WARMUP_SECONDS → 0 cada segundo. Devuelve el id de intervalo.
 */
function startCountdown() {
  let s = WARMUP_SECONDS;
  const getEl = () => document.getElementById(COUNTDOWN_ID);
  const node0 = getEl();
  if (node0) node0.textContent = String(s);
  const intervalId = setInterval(() => {
    s -= 1;
    const node = getEl();
    if (node) node.textContent = String(Math.max(0, s));
    if (s <= 0) clearInterval(intervalId);
  }, 1000);
  return intervalId;
}

let tid = null;

function clearCountdown() {
  if (tid != null) {
    clearInterval(tid);
    tid = null;
  }
}

function scheduleCountdown() {
  clearCountdown();
  tid = startCountdown();
}

/**
 * Ping ligero al backend.
 * - Mismo origen (Netlify) o API local explícita: intento silencioso a `GET /verificacion/pin-test`.
 * - API remota explícita (p. ej. URL absoluta no local): modal + reintento (cold start de PaaS).
 */
export async function warmupBackend() {
  const base = getApiBase();
  const pingUrl = apiUrl("/verificacion/pin-test");
  const explicitRemote = Boolean(base) && !isLocalApiUrl(base);

  if (!explicitRemote) {
    try {
      await fetchPinTestWithTimeout(pingUrl, 20_000);
    } catch {
      /* desarrollo / Netlify: sin modal */
    }
    return { ok: true, retried: false };
  }

  migrateLegacySessionStorage();

  if (readWarmTimestamp() !== null) {
    try {
      await fetchPinTestWithTimeout(pingUrl, 20_000);
      writeWarmNow();
      return { ok: true, retried: false };
    } catch {
      clearWarm();
    }
  }

  Swal.fire({
    title: "Estamos conectando los servidores",
    html: warmupHtml("Espera un momento…"),
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
      scheduleCountdown();
    },
  });

  const attempt = async (timeoutMs) => {
    const res = await fetchPinTestWithTimeout(pingUrl, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };

  try {
    await attempt(MS_FIRST);
    clearCountdown();
    writeWarmNow();
    Swal.close();
    return { ok: true, retried: false };
  } catch {
    clearCountdown();
    Swal.update({
      title: "Reintentando conexión",
      html: warmupHtml(
        "Hacemos un <strong>segundo intento automático</strong>. Espera un momento…",
      ),
    });
    Swal.showLoading();
    setTimeout(() => scheduleCountdown(), 0);

    try {
      await attempt(MS_RETRY);
      clearCountdown();
      writeWarmNow();
      Swal.close();
      return { ok: true, retried: true };
    } catch (e2) {
      clearCountdown();
      Swal.close();
      return { ok: false, retried: true, error: e2 };
    }
  }
}
