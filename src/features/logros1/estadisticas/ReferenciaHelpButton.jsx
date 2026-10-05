import Button from "../../../components/ButtonComponente";
import { alertInfo } from "../../../lib/alerts/appAlert";

const HELP_TITLE = "Cómo se leen las referencias";

/** Texto exacto mostrado al usuario (SweetAlert info). */
export const REFERENCIA_HELP_HTML = `
  <div style="text-align:left;line-height:1.45;font-size:0.95rem">
    <p style="margin:0 0 0.75rem">
      Cada <strong>Referencia</strong> identifica un registro con el patrón
      <strong>documento + tipo + consecutivo</strong>.
    </p>
    <p style="margin:0 0 0.45rem"><strong>Logros 1</strong></p>
    <ul style="margin:0 0 0.75rem;padding-left:1.15rem">
      <li>Formato: <code>documento-R#</code> (ejemplo: <code>1234567890-R1</code>).</li>
      <li>La letra <strong>R</strong> indica Logros 1.</li>
    </ul>
    <p style="margin:0 0 0.45rem"><strong>Logros 2</strong></p>
    <ul style="margin:0 0 0.75rem;padding-left:1.15rem">
      <li>Formato típico: <code>documento-L2-##</code> (código de seguimiento).</li>
      <li>Si la referencia contiene <strong>L2</strong>, corresponde a Logros 2.</li>
    </ul>
    <p style="margin:0">
      El número al final es el <strong>consecutivo</strong> de registro para ese
      paciente y tipo de encuesta (1, 2, 3…).
    </p>
  </div>
`.trim();

export function showReferenciaHelp() {
  return alertInfo({
    title: HELP_TITLE,
    html: REFERENCIA_HELP_HTML,
  });
}

/**
 * Botón compacto de ayuda sobre códigos de Referencia (Mis encuestas).
 */
export default function ReferenciaHelpButton({ className = "" }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`estad-res__ref-help ${className}`.trim()}
      title="Ayuda: cómo se leen las referencias"
      aria-label="Ayuda sobre códigos de referencia"
      onClick={() => void showReferenciaHelp()}
    >
      <span className="estad-res__ref-help-icon" aria-hidden="true">
        ?
      </span>
      <span className="estad-res__ref-help-label">Ayuda</span>
    </Button>
  );
}
