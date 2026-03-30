import { useNavigate } from "react-router-dom";

// importar logo home
import logoHome from "../assets/home.svg";
// importar avatar
import avatar from "../assets/avatar.png";
import "./AutorizadosHeader.css";

export default function AutorizadosHeader({
  usuario = "Usuario",
  sede = "Sin sede",
  showEncuestasCount = false, // ⬅️ lo dejamos listo para más adelante
  encuestasRealizadas = 0, // ⬅️ lo dejamos listo para más adelante
}) {
  const navigate = useNavigate();

  return (
    <div className="AutorizadosCabecera">
      {/* Avatar (click -> inicio) */}
      <div
        className="Autorizados-avatar"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/")}
        onKeyDown={(e) => (e.key === "Enter" ? navigate("/") : null)}
      >
        <img className="logoavatar" src={avatar} alt="Ir a inicio" />
      </div>

      {/* Título */}
      <div className="Autorizados-titulo">
        <h2 className="titulo">
          Bienvenid@ de nuevo{" "}
          <span className="autorizados-dato">{usuario}</span>
        </h2>

        {showEncuestasCount ? (
          <h2 className="numEncuestas">
            Número de encuestas realizadas:{" "}
            <span className="autorizados-dato">{encuestasRealizadas}</span>
          </h2>
        ) : null}

        <h2 className="numEncuestas">
          Sede: <span className="autorizados-dato">{sede}</span>
        </h2>
      </div>

      {/* Home icon (click -> inicio) */}
      <div
        className="Autorizados-home"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/")}
        onKeyDown={(e) => (e.key === "Enter" ? navigate("/") : null)}
      >
        <img className="logohome" src={logoHome} alt="Ir al inicio" />
      </div>
    </div>
  );
}
