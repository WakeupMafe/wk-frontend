import { useMemo, useState } from "react";
import Button from "../../components/ButtonComponente";
import { Subtitle } from "../../components/typography";
import "./LogrosFase1Viewer.css";

import { buildLogrosFase1DownloadContext } from "./logrosFase1BuildContext";

const LIMITACION_LABELS = {
  mucho: "Mucho",
  bastante: "Bastante",
  poco: "Poco",
  nada: "Nada",
};

const ULTIMA_VEZ_LABELS = {
  "1_2_meses": "1 a 2 meses",
  "3_6_meses": "3 a 6 meses",
  "7_12_meses": "7 a 12 meses",
  mas_1_ano: "Más de un año",
};

const QUE_IMPIDE_LABELS = {
  dolor: "Dolor",
  miedo: "Miedo a moverse o lastimarse",
  debilidad: "Debilidad",
};

const ACTIVIDADES_LABELS = {
  tareas_hogar: "Tareas del hogar",
  autocuidado: "Autocuidado",
  laborales: "Laborales",
  vida_social: "Vida social o familiar",
  ocio: "Ocio",
  ejercicio: "Ejercicio",
};

function formatLimitacion(value) {
  return LIMITACION_LABELS[value] || value || "-";
}

function formatUltimaVez(value) {
  return ULTIMA_VEZ_LABELS[value] || value || "-";
}

function formatQueImpide(value) {
  if (!value) return "-";
  if (Array.isArray(value)) {
    return value.map((item) => QUE_IMPIDE_LABELS[item] || item).join(" - ");
  }
  return QUE_IMPIDE_LABELS[value] || value;
}

function formatActividades(values) {
  if (!values || !values.length) return "-";
  return values.map((item) => ACTIVIDADES_LABELS[item] || item).join(" - ");
}

/**
 * Visualización de encuesta (detalle expandible). Descargas: ver pantalla Filtros.
 */
export default function LogrosFase1Viewer({ paciente }) {
  const [open, setOpen] = useState(false);

  const row = paciente || null;

  const ctx = useMemo(() => buildLogrosFase1DownloadContext(row), [row]);

  const pacienteNombre = ctx?.pacienteNombre ?? "Paciente";
  const totalObjetivos = ctx?.totalObjetivos ?? 0;
  const actividades = ctx?.actividades ?? [];
  const sintomasConObjetivos = ctx?.sintomasConObjetivos ?? [];
  const fechaRegistro = ctx?.fechaRegistro ?? "-";
  const patologiaLabel = ctx?.patologiaLabel ?? "";

  if (!row) return null;

  return (
    <div className="lf1viewer">
      <div className="lf1viewer__tableWrap">
        <div className="lf1viewer__table">
          <div className="lf1viewer__head">
            <div className="lf1viewer__th">Nombre completo</div>
            <div className="lf1viewer__th">Total de objetivos</div>
            <div className="lf1viewer__th">Opciones</div>
          </div>

          <div className="lf1viewer__row">
            <div className="lf1viewer__td">{pacienteNombre}</div>

            <div className="lf1viewer__td lf1viewer__td--center">
              {totalObjetivos}
            </div>

            <div className="lf1viewer__td lf1viewer__td--center">
              <Button
                variant="teal"
                type="button"
                className="lf1viewer__actionBtn"
                onClick={() => setOpen((prev) => !prev)}
              >
                {open ? "Ocultar ▾" : "Visualizar ▾"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="lf1viewer__detailWrap">
          <Button
            variant="teal"
            type="button"
            className="lf1viewer__toggleBtn"
            onClick={() => setOpen(false)}
          >
            ↑ Ocultar encuesta
          </Button>

          <div className="lf1viewer__card">
            <Subtitle as="h3" className="lf1viewer__title">
              Datos principales
            </Subtitle>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Nombre:</span>
              <span className="lf1viewer__v">{pacienteNombre}</span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k"># Documento:</span>
              <span className="lf1viewer__v">{row.documento || "-"}</span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Fecha de registro:</span>
              <span className="lf1viewer__v">{fechaRegistro}</span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Profesional:</span>
              <span className="lf1viewer__v">
                {row.encuestador
                  ? `${row.encuestador}${row.encuestador_nombre ? ` - ${row.encuestador_nombre}` : ""}`
                  : "-"}
              </span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Sede:</span>
              <span className="lf1viewer__v">{row.sede || "-"}</span>
            </div>

            {patologiaLabel ? (
              <div className="lf1viewer__kv">
                <span className="lf1viewer__k">Patología:</span>
                <span className="lf1viewer__v">{patologiaLabel}</span>
              </div>
            ) : null}

            <div className="lf1viewer__separator" />

            <Subtitle as="h3" className="lf1viewer__title">
              Resultados de la encuesta
            </Subtitle>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Limitación para moverse:</span>
              <span className="lf1viewer__v">
                {formatLimitacion(row.limitacion_moverse)}
              </span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Actividades afectadas:</span>
              <span className="lf1viewer__v">
                {formatActividades(actividades)}
              </span>
            </div>

            {row.adicional_no_puede ? (
              <div className="lf1viewer__kv">
                <span className="lf1viewer__k">
                  Actividad adicional que no puede realizar:
                </span>
                <span className="lf1viewer__v">{row.adicional_no_puede}</span>
              </div>
            ) : null}

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Última vez:</span>
              <span className="lf1viewer__v">
                {formatUltimaVez(row.ultima_vez)}
              </span>
            </div>

            <div className="lf1viewer__kv">
              <span className="lf1viewer__k">Qué impide:</span>
              <span className="lf1viewer__v">
                {formatQueImpide(row.que_impide)}
              </span>
            </div>

            <div className="lf1viewer__kv lf1viewer__kv--stack">
              <span className="lf1viewer__k">Síntomas y objetivos:</span>

              <div className="lf1viewer__v">
                {sintomasConObjetivos.length ? (
                  <div className="lf1viewer__miniTable">
                    <div className="lf1viewer__miniHead">
                      <div>#</div>
                      <div>Síntoma</div>
                      <div>Objetivo</div>
                    </div>

                    {sintomasConObjetivos.map((item) => (
                      <div className="lf1viewer__miniRow" key={item.numero}>
                        <div>{item.numero}</div>
                        <div>{item.sintoma}</div>
                        <div>{item.objetivo}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </div>
            </div>

            {row.otro_sintoma ? (
              <div className="lf1viewer__kv">
                <span className="lf1viewer__k">Otro síntoma:</span>
                <span className="lf1viewer__v">{row.otro_sintoma}</span>
              </div>
            ) : null}

            {row.objetivo_extra ? (
              <div className="lf1viewer__kv">
                <span className="lf1viewer__k">Objetivo extra:</span>
                <span className="lf1viewer__v">{row.objetivo_extra}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
