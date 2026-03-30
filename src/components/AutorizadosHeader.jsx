import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import logoHome from "../assets/home.svg";
import avatar from "../assets/avatar.png";
import "./AutorizadosHeader.css";

function clearSesionLocal() {
  try {
    sessionStorage.removeItem("wk_pin");
    sessionStorage.removeItem("wk_autorizado");
    sessionStorage.removeItem("wk_contexto_directorio");
  } catch {
    /* ignore */
  }
}

export default function AutorizadosHeader({
  usuario = "Usuario",
  sede = "Sin sede",
  showEncuestasCount = false,
  encuestasRealizadas = 0,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const menuId = useId();

  const irInicio = () => {
    navigate("/");
    setMenuOpen(false);
  };

  const cerrarSesion = () => {
    clearSesionLocal();
    setMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [menuOpen]);

  return (
    <>
      {/* Escritorio: layout en 3 columnas */}
      <div
        className="AutorizadosCabecera AutorizadosCabecera--desktop"
        aria-hidden={menuOpen ? "true" : undefined}
      >
        <div
          className="Autorizados-avatar"
          role="button"
          tabIndex={0}
          onClick={irInicio}
          onKeyDown={(e) => (e.key === "Enter" ? irInicio() : null)}
        >
          <img
            className="logoavatar"
            src={avatar}
            alt="Ir a inicio"
            decoding="async"
            loading="lazy"
          />
        </div>

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

        <div
          className="Autorizados-home"
          role="button"
          tabIndex={0}
          onClick={irInicio}
          onKeyDown={(e) => (e.key === "Enter" ? irInicio() : null)}
        >
          <img
            className="logohome"
            src={logoHome}
            alt="Ir al inicio"
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>

      {/* Móvil y tablet: barra + menú lateral */}
      <div className="AutorizadosCabecera AutorizadosCabecera--compact">
        <button
          type="button"
          className="autorizados-menu-trigger"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú de sesión"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span
            className={`autorizados-menu-trigger__icon ${
              menuOpen ? "autorizados-menu-trigger__icon--open" : ""
            }`}
            aria-hidden
          >
            <span />
            <span />
            <span />
          </span>
        </button>

        <span className="autorizados-compact-brand">Wakeup</span>

        <button
          type="button"
          className="autorizados-compact-home"
          onClick={irInicio}
          aria-label="Ir al inicio"
        >
          <img
            src={logoHome}
            alt=""
            className="autorizados-compact-home__img"
            decoding="async"
            loading="lazy"
          />
        </button>
      </div>

      {menuOpen ? (
        <>
          <div
            className="autorizados-menu-backdrop"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id={menuId}
            className="autorizados-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
          >
            <div className="autorizados-menu-panel__top">
              <h2 id={`${menuId}-title`} className="autorizados-menu-panel__title">
                Mi sesión
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="autorizados-menu-panel__close"
                aria-label="Cerrar panel"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="autorizados-menu-panel__body">
              <div className="autorizados-menu-avatar-wrap">
                <img
                  className="autorizados-menu-avatar"
                  src={avatar}
                  alt=""
                  decoding="async"
                />
              </div>

              <p className="autorizados-menu-line autorizados-menu-line--lead">
                Bienvenid@ de nuevo{" "}
                <span className="autorizados-dato">{usuario}</span>
              </p>

              {showEncuestasCount ? (
                <p className="autorizados-menu-line">
                  Número de encuestas realizadas:{" "}
                  <span className="autorizados-dato">{encuestasRealizadas}</span>
                </p>
              ) : null}

              <p className="autorizados-menu-line">
                Sede: <span className="autorizados-dato">{sede}</span>
              </p>

              <div className="autorizados-menu-actions">
                <button
                  type="button"
                  className="autorizados-menu-btn autorizados-menu-btn--secondary"
                  onClick={irInicio}
                >
                  Ir al inicio
                </button>
                <button
                  type="button"
                  className="autorizados-menu-btn autorizados-menu-btn--logout"
                  onClick={cerrarSesion}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
