import { useNavigate } from "react-router-dom";
import "./NavBackButton.css";

/**
 * Botón de volver unificado (misma línea visual que menú / inicio del header compacto).
 * @param {string} [to] Ruta destino. Si no se pasa, usa `navigate(-1)`.
 * @param {object} [state] Estado para `navigate(to, { state })`.
 * @param {boolean} [replace]
 * @param {"icon" | "icon-text"} [variant="icon"] Con texto “Volver” al lado.
 */
export default function NavBackButton({
  to,
  state,
  replace = false,
  className = "",
  ariaLabel = "Volver",
  variant = "icon",
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to, { state, replace });
    } else {
      navigate(-1);
    }
  };

  const mod =
    variant === "icon-text"
      ? "nav-back-btn--with-label"
      : "";

  return (
    <button
      type="button"
      className={`nav-back-btn ${mod} ${className}`.trim()}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      <svg
        className="nav-back-btn__icon"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        aria-hidden
      >
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 18l-6-6 6-6"
        />
      </svg>
      {variant === "icon-text" ? (
        <span className="nav-back-btn__label">Volver</span>
      ) : null}
    </button>
  );
}
