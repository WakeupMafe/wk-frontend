import Swal from "sweetalert2";
import "../components/SweetAlert.css";

/** Animaciones vacías = modal aparece al instante (sin demora del popup/icono). */
const SWAL_FAST_CLASSES = {
  showClass: { popup: "", backdrop: "", icon: "" },
  hideClass: { popup: "", backdrop: "", icon: "" },
};

export async function sweetAlert({
  icon = "success",
  title = "",
  text = "",
  html = "",
  confirmButtonText = "Aceptar",
}) {
  return Swal.fire({
    icon,
    title,
    text: html ? undefined : text,
    html: html || undefined,
    confirmButtonText,
    showCloseButton: true,
    closeButtonAriaLabel: "Cerrar",
    ...SWAL_FAST_CLASSES,
  });
}

// ✅ NUEVO: loading inmediato
export function sweetLoading({
  title = "Enviando...",
  text = "Por favor espera un momento",
} = {}) {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
    ...SWAL_FAST_CLASSES,
  });
}

// ✅ NUEVO: cerrar modal
export function sweetClose() {
  Swal.close();
}
