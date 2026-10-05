import { lineasRegistrosExistentes } from "../lib/encuestas/registrosExistentes";

/**
 * Panel in-form: lista tipada de encuestas ya existentes para el documento.
 */
export default function RegistrosExistentesNotice({
  registros = [],
  loading = false,
  title = "Encuestas ya registradas para este documento",
}) {
  const lines = lineasRegistrosExistentes(registros);

  if (loading) {
    return (
      <div
        className="registros-existentes-notice"
        role="status"
        aria-live="polite"
      >
        <p className="registros-existentes-notice__title">{title}</p>
        <p className="registros-existentes-notice__loading">
          Consultando registros previos…
        </p>
      </div>
    );
  }

  if (!lines.length) return null;

  return (
    <div
      className="registros-existentes-notice"
      role="status"
      aria-live="polite"
    >
      <p className="registros-existentes-notice__title">{title}</p>
      <ul className="registros-existentes-notice__list">
        {lines.map((line, idx) => (
          <li key={`${idx}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
