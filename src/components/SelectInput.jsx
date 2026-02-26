import "./TextInput.css"; // reutilizamos estilos

export default function SelectInput({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = "",
}) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={name}>
          {label} {required ? <span className="field__req">*</span> : null}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`field__input ${error ? "field__input--error" : ""}`}
      >
        <option value="">Seleccione una opción</option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}
