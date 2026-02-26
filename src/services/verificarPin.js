import { sweetAlert } from "../components/SweetAlert";

// ✅ Un solo punto de verdad para el backend
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function limpiarCedula(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function limpiarPin(value) {
  return String(value ?? "").trim();
}

export async function verificarPin({ cedula, pin, navigate }) {
  try {
    const cedulaLimpia = limpiarCedula(cedula);
    const pinLimpio = limpiarPin(pin);

    if (!cedulaLimpia) {
      await sweetAlert({
        icon: "warning",
        title: "Falta la cédula",
        text: "Ingresa tu cédula para verificar el PIN.",
        confirmButtonText: "Ok",
      });
      return;
    }

    if (!pinLimpio) {
      await sweetAlert({
        icon: "warning",
        title: "Falta el PIN",
        text: "Ingresa el código para continuar.",
        confirmButtonText: "Ok",
      });
      return;
    }

    console.log("✅ verificarPin.js -> enviando", {
      url: `${API_URL}/verificacion/pin`,
      body: { cedula: cedulaLimpia, pin: pinLimpio },
    });

    const res = await fetch(`${API_URL}/verificacion/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cedula: cedulaLimpia, pin: pinLimpio }),
    });

    const data = await res.json().catch(() => ({}));

    console.log("✅ verificarPin.js -> respuesta", {
      status: res.status,
      data,
    });

    // ✅ Si backend respondió error HTTP (422/400/500/etc)
    if (!res.ok) {
      // pydantic suele mandar detail como array en 422
      let msg = "Intenta nuevamente.";
      if (typeof data?.detail === "string") msg = data.detail;
      else if (Array.isArray(data?.detail)) {
        msg = data.detail
          .map((d) => `${(d?.loc || []).join(".")}: ${d?.msg}`)
          .join(" | ");
      } else if (data?.message) msg = data.message;

      await sweetAlert({
        icon: "error",
        title: `Error del servidor (${res.status})`,
        text: msg,
        confirmButtonText: "Ok",
      });
      return;
    }

    // ✅ Backend ok pero validación lógica falló (pin incorrecto / no existe)
    if (!data?.ok) {
      await sweetAlert({
        icon: "error",
        title: "PIN incorrecto",
        text: "Verifica el código y vuelve a intentarlo.",
        confirmButtonText: "Ok",
      });
      return;
    }

    const usuario = data?.usuario || "Usuario";
    const sede = data?.sede || "Sin sede";

    await sweetAlert({
      icon: "success",
      title: "PIN ingresado correctamente",
      html: `Bienvenid@, <b>${usuario}</b>!`,
      confirmButtonText: "Continuar",
    });

    // ✅ CLAVE: enviar pin y cedula para que AutorizadosInicio no rebote
    navigate("/autorizados-inicio", {
      state: {
        usuario,
        sede,
        pin: pinLimpio,
        cedula: cedulaLimpia,
      },
    });
  } catch (e) {
    console.error("❌ verificarPin.js catch:", e);
    await sweetAlert({
      icon: "error",
      title: "Sin conexión",
      text: "No se pudo conectar al servidor.",
      confirmButtonText: "Ok",
    });
  }
}
