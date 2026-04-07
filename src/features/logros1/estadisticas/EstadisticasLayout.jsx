import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../../../components/ButtonComponente";
import AutorizadosHeader from "../../../components/AutorizadosHeader";
import NavBackButton from "../../../components/NavBackButton";
import "./EstadisticasLayout.css";
import "./EstadisticasPage.css";

export default function EstadisticasLayout() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("Usuario");
  const [sede, setSede] = useState("Sin sede");
  const [encuestasRealizadas, setEncuestasRealizadas] = useState(0);

  useEffect(() => {
    const cached = sessionStorage.getItem("wk_autorizado");
    if (!cached) return;
    try {
      const data = JSON.parse(cached);
      setUsuario(data.usuario || "Usuario");
      setSede(data.sede || "Sin sede");
      setEncuestasRealizadas(data.encuestasRealizadas || 0);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="estad-layout">
      <aside className="estad-sidebar" aria-label="Navegación estadísticas">
        <div className="estad-sidebar__brand" aria-hidden>
          <svg
            className="estad-sidebar__icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19V6" />
            <path d="M4 19h16" />
            <path d="M8 19v-4" />
            <path d="M12 19V9" />
            <path d="M16 19v-7" />
            <path d="M20 19V4" />
            <path d="M12 5l2-2 3 3" />
          </svg>
        </div>

        <nav className="estad-sidebar__nav">
          <NavLink
            to="/estadisticas/dashboard"
            className={({ isActive }) =>
              `estad-sidebar__link${isActive ? " estad-sidebar__link--active" : ""}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/estadisticas/filtros"
            className={({ isActive }) =>
              `estad-sidebar__link${isActive ? " estad-sidebar__link--active" : ""}`
            }
          >
            Filtros
          </NavLink>
          <NavLink
            to="/estadisticas/resultados"
            className={({ isActive }) =>
              `estad-sidebar__link${isActive ? " estad-sidebar__link--active" : ""}`
            }
          >
            Resultados
          </NavLink>
        </nav>

        <Button
          variant="bare"
          type="button"
          className="estad-sidebar__back"
          onClick={() => {
            const pin = sessionStorage.getItem("wk_pin");
            navigate("/autorizados-inicio", {
              state: pin ? { pin } : undefined,
            });
          }}
          aria-label="Volver al inicio autorizados"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </aside>

      <div className="estad-main">
        <div className="estad-main__inner">
          <AutorizadosHeader
            usuario={usuario}
            sede={sede}
            showEncuestasCount={true}
            encuestasRealizadas={encuestasRealizadas}
            mobilePanelTop={
              <nav
                className="estad-mobile-nav"
                aria-label="Secciones de estadísticas"
              >
                <NavLink
                  to="/estadisticas/dashboard"
                  className={({ isActive }) =>
                    `estad-mobile-nav__link${isActive ? " estad-mobile-nav__link--active" : ""}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/estadisticas/filtros"
                  className={({ isActive }) =>
                    `estad-mobile-nav__link${isActive ? " estad-mobile-nav__link--active" : ""}`
                  }
                >
                  Filtros
                </NavLink>
                <NavLink
                  to="/estadisticas/resultados"
                  className={({ isActive }) =>
                    `estad-mobile-nav__link${isActive ? " estad-mobile-nav__link--active" : ""}`
                  }
                >
                  Resultados
                </NavLink>
              </nav>
            }
          />
          <div className="estad-mobile-back">
            <NavBackButton
              to="/autorizados-inicio"
              state={
                sessionStorage.getItem("wk_pin")
                  ? { pin: sessionStorage.getItem("wk_pin") }
                  : undefined
              }
              ariaLabel="Volver al inicio autorizados"
            />
          </div>
          <div className="estad-main__scroll">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
