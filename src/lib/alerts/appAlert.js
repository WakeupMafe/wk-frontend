import Swal from "sweetalert2";
import { APP_ALERT_DEFAULTS } from "./appAlertConfig";

export function appAlert(options = {}) {
  return Swal.fire({
    ...APP_ALERT_DEFAULTS,
    ...options,
  });
}

export function alertSuccess({ title = "Éxito", text = "", html = "" } = {}) {
  return appAlert({
    icon: "success",
    title,
    text,
    html,
  });
}

export function alertError({ title = "Error", text = "", html = "" } = {}) {
  return appAlert({
    icon: "error",
    title,
    text,
    html,
  });
}

export function alertWarning({
  title = "Atención",
  text = "",
  html = "",
} = {}) {
  return appAlert({
    icon: "warning",
    title,
    text,
    html,
  });
}

export function alertInfo({
  title = "Información",
  text = "",
  html = "",
} = {}) {
  return appAlert({
    icon: "info",
    title,
    text,
    html,
  });
}

export function alertConfirm(options = {}) {
  return appAlert({
    icon: options.icon || "question",
    title: options.title || "Confirmación",
    text: options.text || "",
    html: options.html || "",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || "Sí",
    cancelButtonText: options.cancelButtonText || "Cancelar",
  });
}

/** Toasts (esquina): avisos breves sin bloquear la pantalla — p. ej. descargas */
const toastBase = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export function toastSuccess({ title = "Listo", text = "" } = {}) {
  return toastBase.fire({
    icon: "success",
    title,
    ...(text ? { text } : {}),
  });
}

export function toastError({ title = "Error", text = "" } = {}) {
  return toastBase.fire({
    icon: "error",
    title,
    ...(text ? { text } : {}),
  });
}

export function toastInfo({
  title,
  text = "",
  html = "",
  timer = 4000,
} = {}) {
  const opts = {
    icon: "info",
    timer,
  };
  if (html) {
    opts.html = html;
    if (title != null && String(title).trim()) opts.title = title;
  } else {
    opts.title =
      title != null && String(title).trim() ? title : "Información";
    if (text) opts.text = text;
  }
  return toastBase.fire(opts);
}
/* ================================
   ALERTA ESPECIAL: USUARIO EXISTE
================================ */

export async function alertUsuarioYaExiste({ onReenviarPin } = {}) {
  const result = await appAlert({
    icon: "warning",
    title: "Usuario ya registrado",
    html: `
      <p>El usuario que intentas registrar <b>ya está en nuestro sistema</b>.</p>
      <p>Puedes solicitar el reenvío del PIN para ingresar.</p>
    `,
    showCancelButton: true,
    confirmButtonText: "Reenviar PIN",
    cancelButtonText: "Cerrar",
  });

  if (result.isConfirmed && typeof onReenviarPin === "function") {
    await onReenviarPin();
  }

  return result;
}
