import Button from "./ButtonComponente";
import { alertInfo } from "../lib/alerts/appAlert";

/**
 * Botón compacto de ayuda para la búsqueda de paciente (Logros 2 / 3).
 * Muestra el contenido en SweetAlert (alertInfo).
 */
export default function PatientSearchHelpButton({
  title = "Ayuda: buscar paciente",
  html,
  className = "",
  ariaLabel = "Ayuda sobre cómo buscar paciente",
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`patient-search-help ${className}`.trim()}
      title={ariaLabel}
      aria-label={ariaLabel}
      onClick={() =>
        void alertInfo({
          title,
          html,
        })
      }
    >
      <span className="patient-search-help__icon" aria-hidden="true">
        ?
      </span>
      <span className="patient-search-help__label">Ayuda</span>
    </Button>
  );
}
