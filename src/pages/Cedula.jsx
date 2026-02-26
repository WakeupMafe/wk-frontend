import { useState } from "react";
import { useNavigate } from "react-router-dom";

import WelcomeLayout from "../layouts/WelcomeLayout";
import fondo from "../assets/fondo.webp";
import TopBar from "../components/TopBar";
import SideDots from "../components/SideDots";
import avatar from "../assets/avatar_bienvenida.svg";
import gifRecuerda from "../assets/gif_recuerda.gif"; // ✅ nombre consistente
import "./Bienvenidas.css";

export default function Cedula() {
  const [cedula, setCedula] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const rawValue = e.target.value;

    if (/[^\d]/.test(rawValue))
      setError("Solo se aceptan caracteres numéricos");
    else setError("");

    setCedula(rawValue.replace(/\D/g, "").slice(0, 10));
  };

  // FUNCIÓN: Verificar que la cédula esta en backend antes de continuar
  const handleEnterSystem = async () => {
    if (!cedula) return setError("La cédula es obligatoria");
    if (cedula.length < 5) return setError("La cédula ingresada no es válida");

    try {
      setError("");

      const res = await fetch("http://127.0.0.1:8000/verificacion/cedula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedula }), // ✅ string
      });

      if (!res.ok) {
        return setError("Error del servidor");
      }

      // ✅ Solo si el backend dice que existe, pasas a /pin
      const data = await res.json();

      if (!data.ok) {
        return setError("Tu cédula no está autorizada");
      }

      navigate("/pin", { state: { cedula } }); // ✅ string
    } catch (e) {
      console.error(e);
      setError("No se pudo conectar al servidor");
    }
  };

  return (
    <>
      <WelcomeLayout image={fondo} />
      <TopBar />
      <SideDots step={1} />

      <main className="Welcome">
        <section className="welcome-content">
          <h1 className="titulo-recuerda">
            Recuerda
            <img src={gifRecuerda} alt="Advertencia" className="gif-recuerda" />
          </h1>

          <h2 className="cedula-h2">
            Para ingresar al sistema, tu cédula debe estar{" "}
            <span className="negritas">autorizada</span>
          </h2>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Ingresa tu cédula"
            value={cedula}
            onChange={handleChange}
            className={`input-cedula ${error ? "input-error" : ""}`}
            onKeyDown={(e) => e.key === "Enter" && handleEnterSystem()}
          />

          {error && <p className="input-error-text">{error}</p>}

          <button
            className="btn-entrar"
            onClick={handleEnterSystem}
            disabled={!cedula}
          >
            Continuar ›
          </button>
        </section>

        <aside className="welcome-avatar">
          <img src={avatar} alt="Avatar" />
        </aside>
      </main>
    </>
  );
}
