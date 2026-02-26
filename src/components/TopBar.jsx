// Componente que contiene el logo y el boton de Ingreso Primera Vez
// Importamos el css y la imagen del logo
import "./TopBar.css";
import logo from "../assets/logo.svg";
import { useNavigate } from "react-router-dom";
// importar login page

export default function TopBar() {
  const navigate = useNavigate();
  // Funcion para navegar a la pagina de login
  const handleLoginNavigation = () => {
    navigate("/login");
  };
  return (
    <div className="top-bar">
      <header className="top-bar-header">
        <img src={logo} className="top-bar-logo" />
        <button className="top-bar-button" onClick={handleLoginNavigation}>
          Ingreso Primera Vez
        </button>
      </header>
    </div>
  );
}
