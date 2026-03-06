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
