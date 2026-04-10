import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { inferGenderFromName } from "../lib/inferGenderFromName";
import { homeIconSrcForGender } from "../assets/homeIconSrc.js";
import logoWakeup from "../assets/logo.svg";
import { apiUrl } from "../lib/api/baseUrl";
import {
  emitPerfilActualizado,
  readAutorizadoCache,
} from "../lib/autorizadoPerfilEvents";
import { alertError, alertSuccess } from "../lib/alerts/appAlert";
import { formatApiDetail } from "../lib/formatApiDetail";
import SelectInput from "./SelectInput";
import TextInput from "./TextInput";
import ButtonC from "./ButtonComponente";
import "./AutorizadosHeader.css";

const SEDES_PERFIL = [
  { value: "Poblado", label: "Poblado" },
  { value: "Laureles", label: "Laureles" },
  { value: "Barranquilla", label: "Barranquilla" },
];

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

function IconClipboardCheck({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-5.5 9.5 2 2 4-4"
      />
    </svg>
  );
}

function IconMapPin({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-8-5.33-8-11a8 8 0 1 1 16 0c0 5.67-8 11-8 11z"
      />
      <circle
        cx="12"
        cy="10"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function IconPencil({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      />
    </svg>
  );
}

function IconEnvelope({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16v12H4V6zm0 0 8 5 8-5"
      />
    </svg>
  );
}

export default function AutorizadosHeader({
  usuario = "Usuario",
  sede = "Sin sede",
  /** Correo desde el padre; si no se pasa, se usa `wk_autorizado` en sessionStorage. */
  correo: correoProp,
  /** PIN de sesión; si falta, se usa `wk_pin` en sessionStorage. */
  sessionPin,
  perfilLoading = false,
  showEncuestasCount = false,
  encuestasRealizadas = 0,
  /** Contenido extra arriba del panel móvil (p. ej. enlaces Dashboard / Filtros en estadísticas). */
  mobilePanelTop = null,
  onPerfilActualizado,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const menuId = useId();
  const nameGender = inferGenderFromName(usuario);

  const [draftSede, setDraftSede] = useState(sede);
  const [draftCorreo, setDraftCorreo] = useState("");
  const [perfilFieldError, setPerfilFieldError] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  /** Panel móvil: el formulario sede/correo va tras «Editar perfil». */
  const [editingPerfilMobile, setEditingPerfilMobile] = useState(false);
  const [desktopPerfilOpen, setDesktopPerfilOpen] = useState(false);
  const desktopPanelId = useId();

  const pinSession = (
    sessionPin ||
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("wk_pin")
      : "") ||
    ""
  ).trim();

  const showPerfilForm =
    Boolean(pinSession) && !perfilLoading && usuario !== "Cargando...";

  useEffect(() => {
    const sedeOk =
      sede && SEDES_PERFIL.some((o) => o.value === sede) ? sede : "";
    setDraftSede(sedeOk);
    if (correoProp !== undefined && correoProp !== null) {
      setDraftCorreo(String(correoProp).trim());
    } else {
      setDraftCorreo(String(readAutorizadoCache().correo || "").trim());
    }
    setPerfilFieldError("");
  }, [sede, correoProp, perfilLoading]);

  useEffect(() => {
    if (!showPerfilForm) setEditingPerfilMobile(false);
  }, [showPerfilForm]);

  useEffect(() => {
    if (!menuOpen) setEditingPerfilMobile(false);
  }, [menuOpen]);

  const sincronizarBorradorPerfil = () => {
    const sedeOk =
      sede && SEDES_PERFIL.some((o) => o.value === sede) ? sede : "";
    setDraftSede(sedeOk);
    if (correoProp !== undefined && correoProp !== null) {
      setDraftCorreo(String(correoProp).trim());
    } else {
      setDraftCorreo(String(readAutorizadoCache().correo || "").trim());
    }
    setPerfilFieldError("");
  };

  const cancelarEdicionMobile = () => {
    setEditingPerfilMobile(false);
    sincronizarBorradorPerfil();
  };

  const handlePerfilFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === "sedePerfil") setDraftSede(value);
    if (name === "correoPerfil") setDraftCorreo(value);
    setPerfilFieldError("");
  };

  const guardarPerfil = async () => {
    if (!pinSession || guardandoPerfil) return;

    const correoTrim = draftCorreo.trim();
    if (!correoTrim) {
      setPerfilFieldError("Ingresa un correo válido.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(correoTrim)) {
      setPerfilFieldError("Formato de correo inválido.");
      return;
    }
    if (!draftSede || !SEDES_PERFIL.some((o) => o.value === draftSede)) {
      setPerfilFieldError("Selecciona una sede.");
      return;
    }

    setGuardandoPerfil(true);
    setPerfilFieldError("");
    try {
      const res = await fetch(apiUrl("/autorizados/actualizar-perfil"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinSession,
          sede: draftSede,
          correo: correoTrim.toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alertError({
          title: "No se pudo guardar",
          text: formatApiDetail(data?.detail) || "Intenta nuevamente.",
        });
        return;
      }

      const row = data?.data;
      const nextSede = row?.sede ?? draftSede;
      const nextCorreo = row?.correo ?? correoTrim.toLowerCase();

      try {
        const prev = readAutorizadoCache();
        sessionStorage.setItem(
          "wk_autorizado",
          JSON.stringify({
            ...prev,
            usuario: row?.nombres ?? prev.usuario ?? usuario,
            sede: nextSede,
            correo: nextCorreo,
            cedula: row?.cedula ?? prev.cedula ?? null,
            encuestasRealizadas:
              row?.encuestas_realizadas ?? prev.encuestasRealizadas ?? 0,
          }),
        );
      } catch {
        /* ignore */
      }

      emitPerfilActualizado({ sede: nextSede, correo: nextCorreo });
      onPerfilActualizado?.({
        sede: nextSede,
        correo: nextCorreo,
        nombres: row?.nombres,
        encuestasRealizadas: row?.encuestas_realizadas,
      });

      await alertSuccess({
        title: "Perfil actualizado",
        text: "Sede y correo guardados correctamente.",
      });
      setEditingPerfilMobile(false);
      setDesktopPerfilOpen(false);
    } catch {
      await alertError({
        title: "Sin conexión",
        text: "No se pudo conectar al servidor.",
      });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const perfilFormBlock = (layoutClass, opts = {}) => {
    const { mobileCollapsedUntilEdit = false } = opts;
    if (!showPerfilForm) return null;
    if (mobileCollapsedUntilEdit && layoutClass.includes("mobile")) {
      if (!editingPerfilMobile) return null;
    }
    return (
      <div
        className={`autorizados-perfil-form ${layoutClass}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="autorizados-perfil-form__title">Mis datos</p>
        <SelectInput
          label="Sede"
          name="sedePerfil"
          value={draftSede}
          onChange={handlePerfilFieldChange}
          options={SEDES_PERFIL}
          error=""
        />
        <TextInput
          label="Correo registrado"
          name="correoPerfil"
          type="email"
          value={draftCorreo}
          onChange={handlePerfilFieldChange}
          placeholder="correo@ejemplo.com"
          disabled={guardandoPerfil}
          error={perfilFieldError}
        />
        <ButtonC
          type="button"
          variant="outline"
          size="sm"
          width="100%"
          disabled={guardandoPerfil}
          onClick={guardarPerfil}
        >
          {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
        </ButtonC>
        {layoutClass.includes("mobile") && editingPerfilMobile ? (
          <button
            type="button"
            className="autorizados-menu-btn autorizados-menu-btn--ghost-cancel"
            onClick={cancelarEdicionMobile}
          >
            Cancelar edición
          </button>
        ) : null}
      </div>
    );
  };

  const primerNombre =
    String(usuario || "")
      .trim()
      .split(/\s+/)[0] || usuario;
  const saludoMenu =
    nameGender === "female"
      ? "¡Bienvenida de nuevo,"
      : "¡Bienvenido de nuevo,";
  const sedeMostradaMenu = showPerfilForm
    ? draftSede || sede
    : sede;

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

  useEffect(() => {
    if (!desktopPerfilOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDesktopPerfilOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktopPerfilOpen]);

  const toggleDesktopPerfil = () => {
    setDesktopPerfilOpen((v) => !v);
  };

  const sedeFieldId = `${desktopPanelId}-sede`;
  const correoFieldId = `${desktopPanelId}-correo`;

  const desktopPerfilDropdown = desktopPerfilOpen ? (
    <>
      <div
        className="autorizados-desktop-backdrop"
        aria-hidden
        onClick={() => setDesktopPerfilOpen(false)}
      />
      <div
        id={desktopPanelId}
        className={`autorizados-desktop-dropdown autorizados-desktop-dropdown--${nameGender}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
      >
        <div className="autorizados-desktop-profile-card">
          <p className="autorizados-desktop-profile-card__greeting">
            ¡Bienvenid@ de nuevo{" "}
            <span
              className={`autorizados-desktop-profile-card__name autorizados-dato autorizados-dato--name autorizados-dato--name--${nameGender}`}
            >
              {primerNombre}
            </span>
            {"!"}
          </p>

          {showEncuestasCount ? (
            <div
              className="autorizados-desktop-profile-card__stat"
              role="status"
              aria-label={`Encuestas realizadas: ${encuestasRealizadas}`}
            >
              <span className="autorizados-desktop-profile-card__stat-icon">
                <IconClipboardCheck className="autorizados-desktop-profile-card__stat-svg" />
              </span>
              <span className="autorizados-desktop-profile-card__stat-text">
                Encuestas realizadas:{" "}
                <strong>{encuestasRealizadas}</strong>
              </span>
            </div>
          ) : null}

          {!showPerfilForm && !showEncuestasCount ? (
            <p className="autorizados-desktop-profile-card__hint">
              Sede: <strong>{sede}</strong>
            </p>
          ) : null}

          {showPerfilForm ? (
            <>
              <div
                className="autorizados-desktop-profile-card__rule"
                aria-hidden
              >
                <span className="autorizados-desktop-profile-card__rule-line" />
                <span className="autorizados-desktop-profile-card__rule-label">
                  Mis datos
                </span>
                <span className="autorizados-desktop-profile-card__rule-line" />
              </div>

              <div
                className="autorizados-desktop-profile-card__form"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="autorizados-desktop-field">
                  <label
                    className="autorizados-desktop-field__label"
                    htmlFor={sedeFieldId}
                  >
                    <IconMapPin className="autorizados-desktop-field__glyph" />
                    Sede
                  </label>
                  <select
                    id={sedeFieldId}
                    name="sedePerfil"
                    value={draftSede}
                    onChange={handlePerfilFieldChange}
                    className="autorizados-desktop-field__control"
                  >
                    <option value="">Seleccione una opción</option>
                    {SEDES_PERFIL.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="autorizados-desktop-field">
                  <label
                    className="autorizados-desktop-field__label"
                    htmlFor={correoFieldId}
                  >
                    <IconEnvelope className="autorizados-desktop-field__glyph" />
                    Correo registrado
                  </label>
                  <input
                    id={correoFieldId}
                    name="correoPerfil"
                    type="email"
                    value={draftCorreo}
                    onChange={handlePerfilFieldChange}
                    placeholder="correo@ejemplo.com"
                    disabled={guardandoPerfil}
                    autoComplete="email"
                    className={`autorizados-desktop-field__control${perfilFieldError ? " autorizados-desktop-field__control--error" : ""}`}
                  />
                  {perfilFieldError ? (
                    <p className="autorizados-desktop-field__error">
                      {perfilFieldError}
                    </p>
                  ) : null}
                </div>

                <div className="autorizados-desktop-profile-card__actions">
                  <button
                    type="button"
                    className="autorizados-desktop-profile-card__btn autorizados-desktop-profile-card__btn--edit"
                    onClick={sincronizarBorradorPerfil}
                  >
                    <IconPencil className="autorizados-desktop-profile-card__btn-icon" />
                    Editar perfil
                  </button>
                  <button
                    type="button"
                    className="autorizados-desktop-profile-card__btn autorizados-desktop-profile-card__btn--save"
                    disabled={guardandoPerfil}
                    onClick={guardarPerfil}
                  >
                    {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Escritorio: layout en 3 columnas */}
      <div
        className="AutorizadosCabecera AutorizadosCabecera--desktop"
        aria-hidden={menuOpen ? "true" : undefined}
      >
        <div
          className={`autorizados-desktop-wrap autorizados-desktop-wrap--${nameGender}${desktopPerfilOpen ? " autorizados-desktop-wrap--open" : ""}`}
        >
          <div className="autorizados-desktop-bar autorizados-desktop-bar--toolbar">
            <div
              className="Autorizados-avatar autorizados-desktop-bar__side autorizados-desktop-bar__side--start"
              role="button"
              tabIndex={0}
              aria-expanded={desktopPerfilOpen}
              aria-controls={desktopPanelId}
              aria-haspopup="dialog"
              aria-label={
                desktopPerfilOpen
                  ? "Cerrar panel de perfil"
                  : "Abrir panel de perfil"
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleDesktopPerfil();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleDesktopPerfil();
                }
              }}
            >
              <AvatarFace usuario={usuario} />
            </div>

            <div
              className={`autorizados-desktop-brand autorizados-desktop-brand--${nameGender} autorizados-desktop-brand--in-toolbar`}
              aria-label="Wakeup Seguimiento"
            >
              <img
                src={logoWakeup}
                className="autorizados-desktop-brand__logo"
                alt=""
                decoding="async"
                fetchPriority="low"
              />
              <div className="autorizados-desktop-brand__text">
                <span className="autorizados-desktop-brand__title">Wakeup</span>
                <span className="autorizados-desktop-brand__subtitle">
                  Seguimiento
                </span>
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

          {desktopPerfilDropdown}
        </div>
      </div>

      {/* Móvil y tablet: barra + menú lateral */}
      <div
        className={`AutorizadosCabecera AutorizadosCabecera--compact AutorizadosCabecera--compact--${nameGender}`}
      >
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

        <div
          className={`autorizados-compact-brand autorizados-desktop-brand autorizados-desktop-brand--${nameGender}`}
          aria-label="Wakeup Seguimiento"
        >
          <img
            src={logoWakeup}
            className="autorizados-desktop-brand__logo"
            alt=""
            decoding="async"
            fetchPriority="low"
          />
          <div className="autorizados-desktop-brand__text">
            <span className="autorizados-desktop-brand__title">Wakeup</span>
            <span className="autorizados-desktop-brand__subtitle">
              Seguimiento
            </span>
          </div>
        </div>

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
                className={[
                  "autorizados-menu-panel",
                  `autorizados-menu-panel--${nameGender}`,
                  mobilePanelTop
                    ? "autorizados-menu-panel--with-estad-nav"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${menuId}-title`}
              >
                <div className="autorizados-menu-panel__top">
                  <button
                    type="button"
                    className="autorizados-menu-panel__back"
                    aria-label="Cerrar panel"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <h2
                    id={`${menuId}-title`}
                    className="autorizados-menu-panel__title"
                  >
                    Perfil de Usuario
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
                    {saludoMenu}{" "}
                    <span
                      className={`autorizados-menu-name autorizados-dato autorizados-dato--name autorizados-dato--name--${nameGender}`}
                    >
                      {primerNombre}
                    </span>
                    {"!"}
                  </p>

                  <div className="autorizados-menu-info-rows">
                    {showEncuestasCount ? (
                      <div className="autorizados-menu-info-row">
                        <span className="autorizados-menu-info-row__icon-wrap">
                          <IconClipboardCheck className="autorizados-menu-info-row__icon" />
                        </span>
                        <span className="autorizados-menu-info-row__text">
                          Encuestas realizadas:{" "}
                          <strong>{encuestasRealizadas}</strong>
                        </span>
                      </div>
                    ) : null}
                    <div className="autorizados-menu-info-row">
                      <span className="autorizados-menu-info-row__icon-wrap">
                        <IconMapPin className="autorizados-menu-info-row__icon" />
                      </span>
                      <span className="autorizados-menu-info-row__text">
                        Sede: <strong>{sedeMostradaMenu}</strong>
                      </span>
                    </div>
                  </div>

                  {perfilFormBlock("autorizados-perfil-form--mobile", {
                    mobileCollapsedUntilEdit: true,
                  })}

                  <div className="autorizados-menu-actions">
                    {showPerfilForm && !editingPerfilMobile ? (
                      <button
                        type="button"
                        className="autorizados-menu-btn autorizados-menu-btn--edit-profile"
                        onClick={() => setEditingPerfilMobile(true)}
                      >
                        <IconPencil className="autorizados-menu-btn__icon" />
                        Editar perfil
                      </button>
                    ) : null}
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
