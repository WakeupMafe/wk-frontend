import { useMemo, useRef, useState, useEffect } from "react";
import { alertSuccess } from "../../lib/alerts/appAlert";
import "./LogrosFase1Viewer.css";

import {
  PROBLEMAS as SINTOMAS,
  OBJETIVOS,
} from "../../data/encuestaLogrosCatalog";
import { downloadLogrosFase1Survey } from "./logrosFase1Download";
import { downloadLogrosFase1Pdf } from "./logrosFase1DownloadPdf.jsx";

// Formateos
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

export default function LogrosFase1Viewer({ paciente }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const row = paciente || null;

  const pacienteNombre = useMemo(() => {
    if (!row) return "Paciente";
    return [row.nombres, row.apellidos].filter(Boolean).join(" ") || "Paciente";
  }, [row]);

  const totalObjetivos = useMemo(() => {
    if (!row) return 0;
    const base = [row.objetivo_1, row.objetivo_2, row.objetivo_3].filter(
      Boolean,
    ).length;
    const extra = row.objetivo_extra ? 1 : 0;
    return base + extra;
  }, [row]);

  const actividades = useMemo(() => {
    if (!row?.actividades_afectadas) return [];

    if (Array.isArray(row.actividades_afectadas)) {
      return row.actividades_afectadas;
    }

    try {
      const parsed = JSON.parse(row.actividades_afectadas);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [row]);

  const getSintomaLabel = (value) => {
    if (!value) return "-";
    const found = SINTOMAS.find((s) => s.value === value);
    return found?.label || value;
  };

  const getObjetivoLabel = (sintomaValue, objetivoValue) => {
    if (!objetivoValue) return "-";
    const meta = OBJETIVOS[sintomaValue];
    if (!meta) return objetivoValue;

    const found = meta.opciones?.find((o) => o.value === objetivoValue);
    return found?.label || objetivoValue;
  };

  const sintomasConObjetivos = useMemo(() => {
    if (!row) return [];

    const items = [
      {
        numero: 1,
        sintomaValue: row.sintoma_1,
        objetivoValue: row.objetivo_1,
      },
      {
        numero: 2,
        sintomaValue: row.sintoma_2,
        objetivoValue: row.objetivo_2,
      },
      {
        numero: 3,
        sintomaValue: row.sintoma_3,
        objetivoValue: row.objetivo_3,
      },
    ].filter((item) => item.sintomaValue);

    return items.map((item) => ({
      numero: item.numero,
      sintoma: getSintomaLabel(item.sintomaValue),
      objetivo: getObjetivoLabel(item.sintomaValue, item.objetivoValue),
    }));
  }, [row]);

  const fechaRegistro = row?.created_at
    ? new Date(row.created_at).toLocaleDateString("es-CO")
    : "-";

  const handleVisualizar = () => {
    setOpen((prev) => !prev);
    setMenuOpen(false);
  };

  const handleDescargarJson = async () => {
    if (!row) return;

    downloadLogrosFase1Survey({
      pacienteNombre,
      fechaRegistro,
      totalObjetivos,
      row,
      actividades,
      sintomasConObjetivos,
    });

    setMenuOpen(false);

    await alertSuccess({
      title: "Descarga iniciada",
      text: "El archivo JSON se descargó correctamente.",
    });
  };

  const handleDescargarPdf = async () => {
    if (!row) return;

    await downloadLogrosFase1Pdf({
      pacienteNombre,
      fechaRegistro,
      totalObjetivos,
      row,
      actividades,
      sintomasConObjetivos,
    });

    setMenuOpen(false);

    await alertSuccess({
      title: "Descarga iniciada",
      text: "El archivo PDF se descargó correctamente.",
    });
  };

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
              <div className="lf1viewer__menuBox" ref={menuRef}>
                <button
                  type="button"
                  className="lf1viewer__actionBtn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  Desplegar opción ▾
                </button>

                {menuOpen ? (
                  <div className="lf1viewer__dropdown">
                    <button
                      type="button"
                      className="lf1viewer__dropdownItem"
                      onClick={handleVisualizar}
                    >
                      {open ? "Ocultar visualización" : "Visualizar"}
                    </button>

                    <button
                      type="button"
                      className="lf1viewer__dropdownItem"
                      onClick={handleDescargarPdf}
                    >
                      Descargar PDF
                    </button>

                    <button
                      type="button"
                      className="lf1viewer__dropdownItem"
                      onClick={handleDescargarJson}
                    >
                      Descargar JSON
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="lf1viewer__detailWrap">
          <button
            type="button"
            className="lf1viewer__toggleBtn"
            onClick={() => setOpen(false)}
          >
            ↑ Ocultar encuesta
          </button>

          <div className="lf1viewer__card">
            <h3 className="lf1viewer__title">Datos principales</h3>

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

            <div className="lf1viewer__separator" />

            <h3 className="lf1viewer__title">Resultados de la encuesta</h3>

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
