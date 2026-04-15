import {
  formatActividades,
  formatLimitacion,
  formatQueImpide,
  formatUltimaVez,
} from "./logrosPdfFormatters";
import wakeupLogoUrl from "../../assets/logo.svg";

export default function LogrosFase1PdfTemplate({
  pacienteNombre,
  fechaRegistro,
  fechaDescarga,
  row,
  patologiaLabel,
  actividades,
  sintomasConObjetivos,
}) {
  const profesionalTexto = row?.encuestador
    ? `${row.encuestador}${row?.encuestador_nombre ? ` - ${row.encuestador_nombre}` : ""}`
    : "-";

  return (
    <div
      style={{
        width: "800px",
        background: "#ffffff",
        color: "#1f2a44",
        fontFamily: "Arial, sans-serif",
        padding: "36px 40px",
        boxSizing: "border-box",
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          borderBottom: "3px solid #2c6bed",
          paddingBottom: "14px",
          marginBottom: "24px",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <img
            src={wakeupLogoUrl}
            alt="WakeUp"
            style={{ height: "38px", width: "auto", display: "block" }}
          />
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            color: "#1d4ed8",
            fontWeight: 700,
          }}
        >
          Informe de progreso funcional
        </h1>

        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: "14px",
            color: "#475569",
          }}
        >
          WakeUp se preocupa por tu progreso. Este informe resume los resultados
          y objetivos definidos durante tu evaluación funcional.
        </p>
      </div>

      <h2
        style={{
          fontSize: "18px",
          margin: "0 0 14px 0",
          color: "#1f2a44",
        }}
      >
        Datos principales
      </h2>

      <div style={{ marginBottom: "6px" }}>
        <strong>Nombre:</strong>
        <div>{pacienteNombre || "-"}</div>
      </div>

      <div style={{ marginBottom: "6px" }}>
        <strong># Documento:</strong>
        <div>{row?.documento || "-"}</div>
      </div>

      <div style={{ marginBottom: "6px" }}>
        <strong>Fecha de registro:</strong>
        <div>{fechaRegistro || "-"}</div>
      </div>

      <div style={{ marginBottom: "6px" }}>
        <strong>Profesional:</strong>
        <div>{profesionalTexto}</div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Sede:</strong>
        <div>{row?.sede || "-"}</div>
      </div>

      {patologiaLabel ? (
        <div style={{ marginBottom: "20px" }}>
          <strong>Patología:</strong>
          <div>{patologiaLabel}</div>
        </div>
      ) : null}

      <h2
        style={{
          fontSize: "18px",
          margin: "0 0 14px 0",
          color: "#1f2a44",
        }}
      >
        Resultados de la encuesta
      </h2>

      <div style={{ marginBottom: "10px" }}>
        <strong>Limitación para moverse:</strong>
        <div>{formatLimitacion(row?.limitacion_moverse)}</div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Actividades afectadas:</strong>
        <div>{formatActividades(actividades)}</div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Actividad adicional que no puede realizar:</strong>
        <div>{row?.adicional_no_puede || "-"}</div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Última vez:</strong>
        <div>{formatUltimaVez(row?.ultima_vez)}</div>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <strong>Qué impide:</strong>
        <div>{formatQueImpide(row?.que_impide)}</div>
      </div>

      <h2
        style={{
          fontSize: "18px",
          margin: "0 0 14px 0",
          color: "#1f2a44",
        }}
      >
        Síntomas y objetivos
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #cbd5e1",
                background: "#eaf2ff",
                padding: "10px",
                textAlign: "left",
              }}
            >
              #
            </th>
            <th
              style={{
                border: "1px solid #cbd5e1",
                background: "#eaf2ff",
                padding: "10px",
                textAlign: "left",
              }}
            >
              Síntoma
            </th>
            <th
              style={{
                border: "1px solid #cbd5e1",
                background: "#eaf2ff",
                padding: "10px",
                textAlign: "left",
              }}
            >
              Objetivo
            </th>
          </tr>
        </thead>

        <tbody>
          {sintomasConObjetivos?.length ? (
            sintomasConObjetivos.map((item) => (
              <tr key={item.numero}>
                <td
                  style={{
                    border: "1px solid #cbd5e1",
                    padding: "10px",
                  }}
                >
                  {item.numero}
                </td>
                <td
                  style={{
                    border: "1px solid #cbd5e1",
                    padding: "10px",
                  }}
                >
                  {item.sintoma}
                </td>
                <td
                  style={{
                    border: "1px solid #cbd5e1",
                    padding: "10px",
                  }}
                >
                  {item.objetivo}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={3}
                style={{
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                Sin información
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {row?.otro_sintoma ? (
        <div style={{ marginBottom: "10px" }}>
          <strong>Otro síntoma:</strong>
          <div>{row.otro_sintoma}</div>
        </div>
      ) : null}

      {row?.objetivo_extra ? (
        <div style={{ marginBottom: "10px" }}>
          <strong>Objetivo extra:</strong>
          <div>{row.objetivo_extra}</div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: "28px",
          paddingTop: "14px",
          borderTop: "1px solid #cbd5e1",
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        Documento generado el {fechaDescarga}.
      </div>
    </div>
  );
}
