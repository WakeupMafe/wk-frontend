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

/**
 * Primera petición al backend: en producción muestra modal + reintento (cold start Render).
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
      Swal.close();
      return { ok: true, retried: true };
    } catch (e2) {
      Swal.close();
      return { ok: false, retried: true, error: e2 };
    }
  }
}
