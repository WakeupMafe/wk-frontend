import {
  appAlert,
  alertSuccess,
  alertError,
  alertWarning,
  alertInfo,
  alertConfirm,
  toastInfo,
} from "../lib/alerts/appAlert";

export function useAppAlert() {
  return {
    appAlert,
    alertSuccess,
    alertError,
    alertWarning,
    alertInfo,
    alertConfirm,
    toastInfo,
  };
}
export async function alertUsuarioYaExiste({ onReenviarPin } = {}) {
  const result = await appAlert({
    icon: "warning",
    title: "Usuario ya registrado",
    html: `
      <p>El usuario que intentas registrar ya está en nuestro sistema.</p>
      <p>Puedes verificar tu PIN actual o solicitar el reenvío del código.</p>
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
