import Swal from "sweetalert2";
import "../components/SweetAlert.css";

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
  });
}

// ✅ NUEVO: cerrar modal
export function sweetClose() {
  Swal.close();
}
