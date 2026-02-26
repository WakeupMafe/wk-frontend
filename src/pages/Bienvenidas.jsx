import { useNavigate } from "react-router-dom";

import WelcomeLayout from "../layouts/WelcomeLayout";
import fondo from "../assets/fondo.webp";
import TopBar from "../components/TopBar";
import SideDots from "../components/SideDots";
import avatar from "../assets/avatar_bienvenida.svg";
import "./Bienvenidas.css";

export default function Bienvenidas() {
  // Hook para navegar a otra ruta
  const navigate = useNavigate();
  // Ruta hacia la pagina de ingreso de cedula
  const handleEnterSystem = () => {
    navigate("/cedula");
  };
  return (
    <>
      <WelcomeLayout image={fondo} />
      <TopBar />
      <SideDots step={0} />

      <main className="Welcome">
        <section className="welcome-content">
          <h1>Bienvenid@</h1>
          <h2>
            Al sistema de registro de encuestas de{" "}
            <span className="negritas">Wakeup</span>
          </h2>
          {/* Boton para entrar al sistema */}
          <button className="btn-entrar-bienvenida" onClick={handleEnterSystem}>
            Entrar al sistema ›{" "}
          </button>
        </section>

        <aside className="welcome-avatar">
          <img src={avatar} alt="Avatar" />
        </aside>
      </main>
    </>
  );
}
