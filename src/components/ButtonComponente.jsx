import "./ButtonComponente.css";

export default function Button({
  children,
  variant = "primary",
  width = "30%",
  type = "button",
  onClick,
  disabled = false,
}) {
  return (
    <button
      type={type}
      className={`btn-componente btn--${variant}`}
      style={{ width }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
