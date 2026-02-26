import "./TextInput.css";
export default function TextInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  disabled = false,
  error = "",
  ...rest
}) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={name}>
          {label} {required ? <span className="field__req">*</span> : null}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`field__input ${error ? "field__input--error" : ""}`}
        autoComplete="off"
        {...rest}
      />

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}
