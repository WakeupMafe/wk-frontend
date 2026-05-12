import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import WelcomeLayout from "../layouts/WelcomeLayout";
import fondo from "../assets/fondo.webp";
import TopBar from "../components/TopBar";
import SideDots from "../components/SideDots";
import avatar from "../assets/avatar_bienvenida.svg";
import gifpin from "../assets/gif_pin.gif";
import "./Bienvenidas.css";
import Button from "../components/ButtonComponente";
import { apiUrl } from "../lib/api/baseUrl";
import { textoAyudaFalloEnvio } from "../lib/smtpEnvioAyuda";
import {
  alertSuccess,
  alertError,
  alertWarning,
  toastSuccess,
} from "../lib/alerts/appAlert";

export default function Pin() {
  const navigate = useNavigate();
  const location = useLocation();

  // 👉 cédula recibida desde Cedula.jsx
  const cedula = location.state?.cedula;

  // 👉 PIN que escribe el usuario
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const iniciarCooldown = (segundos = 40) => {
    setCooldown(segundos);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ✅ Si alguien entra directo a /pin SIN pasar por cédula
  if (!cedula) {
    return (
      <div style={{ padding: 40 }}>
        <p>No hay cédula registrada.</p>
        <button onClick={() => navigate("/")}>Volver al inicio</button>
      </div>
    );
  }

  const handleChange = (e) => {
    const raw = e.target.value.toUpperCase();

    // ✅ Permitimos SOLO letras y números
    const cleaned = raw.replace(/[^A-Z0-9]/g, "").slice(0, 5);
    setPin(cleaned);

    if (cleaned.length === 0) {
      setError("");
      return;
    }

    const isValidFormat = /^[A-Z]{2}\d{3}$/.test(cleaned);

    // Solo mostramos error cuando ya completó 5 caracteres
    if (cleaned.length === 5 && !isValidFormat) {
      setError("El PIN debe tener 2 letras y 3 números (ej: AB123)");
    } else {
      setError("");
    }
  };

  // FUNCION: Verificar PIN en backend y continuar
  const handleContinue = async () => {
    const pinLimpio = String(pin || "")
      .trim()
      .toUpperCase();
    const cedulaLimpia = String(cedula || "")
      .replace(/\D/g, "")
      .trim();

    if (!cedulaLimpia) return setError("Cédula inválida");
    if (!pinLimpio) return setError("El PIN es obligatorio");
    if (pinLimpio.length < 5)
      return setError("El PIN debe tener 5 caracteres (ej: AB123)");
    if (!/^[A-Z]{2}\d{3}$/.test(pinLimpio))
      return setError("El PIN debe tener 2 letras y 3 números (ej: AB123)");

    try {
      setError("");

      console.log("📤 Enviando a backend:", {
        cedula: cedulaLimpia,
        pin: pinLimpio,
      });

      const res = await fetch(apiUrl("/verificacion/pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedulaLimpia, // ✅ string
          pin: pinLimpio,
        }),
      });

      // ✅ leer body UNA sola vez (evita: body stream already read)
      const raw = await res.text();
      console.log("📩 RESP RAW:", res.status, raw);

      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        data = {};
      }

      if (!res.ok) {
        // si backend manda detail, lo mostramos
        const msg = data?.detail || data?.message || "Error del servidor";
        setError(msg);
        return;
      }

      if (!data?.ok) {
        setError("PIN incorrecto");
        return;
      }

      const usuario = data?.usuario || "Usuario";
      const sede = data?.sede || "Sin sede";

      navigate("/autorizados-inicio", {
        state: {
          usuario,
          sede,
          pin: pinLimpio,
          cedula: cedulaLimpia,
        },
      });

      toastSuccess({
        title: "Inicio de sesión exitoso",
        text: `Bienvenid@, ${usuario}!`,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo conectar al servidor");
    }
  };

  /** Mismo endpoint y mensajes que «Solicitar Nuevo Código» en registro (LoginFirstTime). */
  const handleReenviarPin = async () => {
    if (cooldown > 0) {
      await alertWarning({
        title: "Espera un momento",
        text: `Puedes solicitar otro código en ${cooldown} segundos.`,
      });
      return;
    }

    const cedulaLimpia = String(cedula || "")
      .replace(/\D/g, "")
      .trim();
    if (!cedulaLimpia) {
      await alertWarning({
        title: "Falta la cédula",
        text: "No se pudo identificar tu documento. Vuelve atrás e ingresa la cédula.",
      });
      return;
    }

    try {
      const res = await fetch(apiUrl("/verificacion/reenviar-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedulaLimpia }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        await alertError({
          title: "No se pudo reenviar",
          text: data?.detail || data?.message || "Intenta nuevamente.",
        });
        return;
      }

      if (data?.ok) {
        /** Solo `=== true`: si falta la propiedad, antes `!== false` trataba undefined como enviado y activaba cooldown al cerrar el modal. */
        const enviado = data.correoEnviado === true;
        const mask = data?.correoDestinoMascarado;
        const ayuda =
          !enviado && data?.envioRazon
            ? textoAyudaFalloEnvio(data.envioRazon)
            : "";
        const htmlOk = `
            <p>Destino según tu cédula: <b>${mask || "correo registrado"}</b>.</p>
            <p>Si el correo es correcto, el PIN te llegará.</p>
            <p><b>Revisa spam</b> también.</p>
          `;
        const htmlFail = `
            <p>Intentamos enviar a: <b>${mask || "tu correo registrado"}</b>.</p>
            ${ayuda}
            <p>Revisa en Netlify → Functions → <code>api</code> los logs al reenviar.</p>
          `;
        if (enviado) {
          await alertSuccess({ title: "PIN reenviado", html: htmlOk });
          iniciarCooldown(40);
        } else {
          await alertError({ title: "No se envió el correo", html: htmlFail });
        }
        return;
      }

      await alertWarning({
        title: "No se pudo reenviar",
        text: data?.detail || data?.message || "Intenta nuevamente.",
      });
    } catch (e) {
      console.error(e);
      await alertError({
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
      });
    }
  };

  return (
    <>
      <WelcomeLayout image={fondo} />
      <TopBar />
      <SideDots step={2} />

      <main className="Welcome">
        <section className="welcome-content">
          <h1 className="titulo-recuerda">
            Excelente
            <img
              src={gifpin}
              alt=""
              className="gif-pin"
              loading="lazy"
              decoding="async"
            />
          </h1>

          <h2 className="cedula-h2">
            Ingresa el <span className="negritas">PIN</span> que recibiste en tu
            correo al registrarte
          </h2>

          <div className="pin-wrap">
            <input
              type={showPin ? "text" : "password"}
              inputMode="text"
              placeholder="Ingresa tu PIN"
              value={pin}
              onChange={handleChange}
              className={`input-cedula ${error ? "input-error" : ""}`}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            />

            <button
              type="button"
              className="pin-eye"
              onClick={() => setShowPin((v) => !v)}
              aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
            >
              {showPin ? "🙈" : "👁️"}
            </button>
          </div>

          {error && <p className="input-error-text">{error}</p>}

          <button
            className="btn-entrar"
            onClick={handleContinue}
            disabled={pin.length !== 5 || !!error}
          >
            Continuar ›
          </button>

          <div className="pin-reenviar-wrap">
            <Button
              type="button"
              variant={cooldown > 0 ? "muted" : "teal"}
              className="pin-reenviar-btn"
              onClick={handleReenviarPin}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? `Reenviar PIN (${cooldown}s)`
                : "Reenviar PIN al correo"}
            </Button>
          </div>
        </section>

        <aside className="welcome-avatar">
          <img
            src={avatar}
            alt="Avatar"
            decoding="async"
            fetchPriority="high"
          />
        </aside>
      </main>
    </>
  );
}
