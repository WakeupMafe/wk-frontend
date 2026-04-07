import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { inferGenderFromName } from "../lib/inferGenderFromName";
import { homeIconSrcForGender } from "../assets/homeIconSrc.js";
import "./AutorizadosHeader.css";

function AvatarFace({ usuario, menu = false }) {
  const g = inferGenderFromName(usuario);
  const cls = menu
    ? `autorizados-menu-avatar autorizados-avatar-face autorizados-avatar-face--${g}`
    : `autorizados-avatar-face autorizados-avatar-face--${g}`;
  return (
    <span className={cls} aria-hidden>
      <svg
        className="autorizados-avatar-face__icon"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
        />
      </svg>
    </span>
  );
}

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
  /** Contenido extra arriba del panel móvil (p. ej. enlaces Dashboard / Filtros en estadísticas). */
  mobilePanelTop = null,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const menuId = useId();
  const nameGender = inferGenderFromName(usuario);

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
        <div className="autorizados-desktop-bar">
          <div
            className="Autorizados-avatar autorizados-desktop-bar__side autorizados-desktop-bar__side--start"
            role="button"
            tabIndex={0}
            onClick={irInicio}
            onKeyDown={(e) => (e.key === "Enter" ? irInicio() : null)}
          >
            <AvatarFace usuario={usuario} />
          </div>

          <div className="Autorizados-titulo autorizados-desktop-bar__main">
            <div className="autorizados-desktop-panel">
              <p className="autorizados-welcome-line">
                Bienvenid@ de nuevo{" "}
                <span
                  className={`autorizados-dato autorizados-dato--name autorizados-dato--name--${nameGender}`}
                >
                  {usuario}
                </span>
              </p>
              <div className="autorizados-stats" aria-label="Resumen de sesión">
                {showEncuestasCount ? (
                  <div className="autorizados-stat">
                    <span className="autorizados-stat__label">
                      Encuestas realizadas
                    </span>
                    <span className="autorizados-stat__value">
                      {encuestasRealizadas}
                    </span>
                  </div>
                ) : null}
                <div className="autorizados-stat">
                  <span className="autorizados-stat__label">Sede</span>
                  <span className="autorizados-stat__value">{sede}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="Autorizados-home autorizados-desktop-bar__side autorizados-desktop-bar__side--end"
            role="button"
            tabIndex={0}
            onClick={irInicio}
            onKeyDown={(e) => (e.key === "Enter" ? irInicio() : null)}
            aria-label="Ir al inicio"
          >
            <img
              className="autorizados-home-img"
              src={homeIconSrcForGender(nameGender)}
              alt=""
              decoding="async"
              loading="lazy"
            />
          </div>
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
            className="autorizados-home-img"
            src={homeIconSrcForGender(nameGender)}
            alt=""
            decoding="async"
            loading="lazy"
          />
        </button>
      </div>

      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="autorizados-menu-backdrop"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <aside
                id={menuId}
                className={
                  mobilePanelTop
                    ? "autorizados-menu-panel autorizados-menu-panel--with-estad-nav"
                    : "autorizados-menu-panel"
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${menuId}-title`}
              >
                <div className="autorizados-menu-panel__top">
                  <h2
                    id={`${menuId}-title`}
                    className="autorizados-menu-panel__title"
                  >
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

                <div
                  className={
                    mobilePanelTop
                      ? "autorizados-menu-panel__body autorizados-menu-panel__body--compact"
                      : "autorizados-menu-panel__body"
                  }
                >
                  <div className="autorizados-menu-avatar-wrap">
                    <AvatarFace usuario={usuario} menu />
                  </div>

                  <p className="autorizados-menu-line autorizados-menu-line--lead">
                    Bienvenid@ de nuevo{" "}
                    <span
                      className={`autorizados-dato autorizados-dato--name autorizados-dato--name--${nameGender}`}
                    >
                      {usuario}
                    </span>
                  </p>

                  {showEncuestasCount ? (
                    <p className="autorizados-menu-line">
                      Número de encuestas realizadas:{" "}
                      <span className="autorizados-dato">
                        {encuestasRealizadas}
                      </span>
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

                {mobilePanelTop ? (
                  <div
                    className="autorizados-menu-panel__estad"
                    onClick={(e) => {
                      if (e.target.closest("a[href]")) setMenuOpen(false);
                    }}
                  >
                    {mobilePanelTop}
                  </div>
                ) : null}
              </aside>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
