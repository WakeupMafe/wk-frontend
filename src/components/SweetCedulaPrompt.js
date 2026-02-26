import Swal from "sweetalert2";

/**
 * Pide la cédula del fisioterapeuta y devuelve:
 * - string solo dígitos si confirma
 * - null si cancela
 */
export async function pedirCedulaFisio() {
  const { value, isConfirmed } = await Swal.fire({
    title: "Cédula del fisioterapeuta",
    text: "Digite la cédula para registrar el envío de la encuesta.",
    input: "text",
    inputPlaceholder: "Ej: 1234567890",
    showCancelButton: true,
    confirmButtonText: "Continuar",
    cancelButtonText: "Cancelar",
    inputAttributes: {
      inputmode: "numeric",
      autocapitalize: "off",
      autocorrect: "off",
    },
    preConfirm: (val) => {
      const onlyDigits = (val || "").replace(/\D/g, "");

      if (!onlyDigits) {
        Swal.showValidationMessage("La cédula es obligatoria.");
        return false;
      }
      if (onlyDigits.length < 6 || onlyDigits.length > 10) {
        Swal.showValidationMessage(
          "La cédula debe tener entre 6 y 10 dígitos.",
        );
        return false;
      }

      return onlyDigits;
    },
  });

  if (!isConfirmed) return null;
  return value; // ya viene validado por preConfirm
}
