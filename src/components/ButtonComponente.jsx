import "./ButtonComponente.css";

const VARIANTS = new Set([
  "normal",
  "emphasis",
  "muted",
  "teal",
  "outline",
  "tealSoft",
  "ghost",
  "accent",
]);

/**
 * Botón unificado de la app.
 *
 * @param {"normal" | "emphasis" | "muted" | "primary" | "teal" | "outline" | "tealSoft" | "ghost" | "accent" | "bare"} variant
 *   - normal — azul pastel (acción estándar)
 *   - primary — alias de normal
 *   - emphasis — lila profundo (envío / cierre importante)
 *   - muted — gris secundario
 *   - teal — primario lila pastel (API histórica “teal”)
 *   - outline — contorno lila, fondo blanco
 *   - tealSoft — lila claro (p. ej. “Añadir síntoma”)
 *   - ghost — transparente, iconos / quitar
 *   - accent — azul pastel (login / visor)
 *   - bare — sin estilos base; solo `className` (p. ej. botón circular sidebar)
 * @param {"sm" | "md"} size
 */
export default function Button({
  children,
  variant = "normal",
  size = "md",
  type = "button",
  onClick,
  disabled = false,
  className = "",
  width,
  ...rest
}) {
  if (variant === "bare") {
    return (
      <button
        type={type}
        className={className.trim()}
        disabled={disabled}
        onClick={onClick}
        style={width ? { width } : undefined}
        {...rest}
      >
        {children}
      </button>
    );
  }

  let resolved = variant === "primary" ? "normal" : variant;
  if (!VARIANTS.has(resolved)) resolved = "normal";

  const sizeClass = size === "sm" ? " btn--sm" : "";

  return (
    <button
      type={type}
      className={`btn-componente btn--${resolved}${sizeClass} ${className}`.trim()}
      style={width ? { width } : undefined}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
