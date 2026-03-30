import "./ButtonComponente.css";

/**
 * @param {"normal" | "emphasis" | "muted" | "primary"} variant
 *   - normal (#7da1c1) — acciones estándar; hover verde
 *   - primary — alias de normal (compatibilidad)
 *   - emphasis (#1f3a5f) — enviar, confirmar, acciones prioritarias
 *   - muted (#98a0a8) — volver, secundario
 */
export default function Button({
  children,
  variant = "normal",
  width,
  type = "button",
  onClick,
  disabled = false,
  className = "",
}) {
  let resolved = variant === "primary" ? "normal" : variant;
  if (!["normal", "emphasis", "muted"].includes(resolved)) resolved = "normal";

  return (
    <button
      type={type}
      className={`btn-componente btn--${resolved} ${className}`.trim()}
      style={width ? { width } : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
