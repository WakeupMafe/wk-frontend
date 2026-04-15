import { useMemo } from "react";
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
  const row = paciente || null;

  const ctx = useMemo(() => buildLogrosFase1DownloadContext(row), [row]);

  const pacienteNombre = ctx?.pacienteNombre ?? "Paciente";
  const totalObjetivos = ctx?.totalObjetivos ?? 0;
  const actividades = ctx?.actividades ?? [];
  const sintomasConObjetivos = ctx?.sintomasConObjetivos ?? [];
  const filasSintomas = useMemo(() => {
    const base = Array.isArray(sintomasConObjetivos) ? [...sintomasConObjetivos] : [];
    const normales = base.filter((it) => String(it?.sintomaValue ?? "") !== "otro");
    const otrosGenericos = base.filter((it) => String(it?.sintomaValue ?? "") === "otro");
    const otroLibre = row?.otro_sintoma
      ? [
          {
            numero: "otro_libre",
            sintoma: row.otro_sintoma,
            objetivo: row.objetivo_extra || "-",
          },
        ]
      : [];

    // Regla visual: "Otro" (genérico) siempre se muestra al final.
    return [...normales, ...otroLibre, ...otrosGenericos];
  }, [sintomasConObjetivos]);
  const fechaRegistro = ctx?.fechaRegistro ?? "-";
  const patologiaLabel = ctx?.patologiaLabel || "No reportada";
  const profesional = row?.encuestador
    ? `${row.encuestador}${row.encuestador_nombre ? ` - ${row.encuestador_nombre}` : ""}`
    : "-";
  const actividadesLabel = formatActividades(actividades);
  const narrativa = [
    `En la valoración inicial, ${pacienteNombre} registró una limitación ${formatLimitacion(row.limitacion_moverse).toLowerCase()} para moverse.`,
    `Las actividades más afectadas corresponden a: ${actividadesLabel}.`,
    `La última vez que realizó estas actividades fue hace ${formatUltimaVez(row.ultima_vez).toLowerCase()} y el principal factor reportado fue ${formatQueImpide(row.que_impide).toLowerCase()}.`,
    row.adicional_no_puede
      ? `Actividad adicional reportada: ${row.adicional_no_puede}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!row) return null;

  return (
    <div className="lf1viewer">
      <div className="lf1viewer__head">
        <div>
          <p className="lf1viewer__kicker">Resumen de evaluación inicial</p>
          <h4 className="lf1viewer__title">Encuesta Logros 1</h4>
        </div>
        <span className="lf1viewer__pill">
          {totalObjetivos} objetivo{totalObjetivos === 1 ? "" : "s"}
        </span>
      </div>

      <p className="lf1viewer__sectionLabel">Datos principales de la evaluación</p>
      <div className="lf1viewer__meta">
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Nombre completo del paciente</span>
          <strong className="lf1viewer__metaValue">{pacienteNombre}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Documento de identidad</span>
          <strong className="lf1viewer__metaValue">{row.documento || "-"}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Fecha de registro</span>
          <strong className="lf1viewer__metaValue">{fechaRegistro}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Sede de atencion</span>
          <strong className="lf1viewer__metaValue">{row.sede || "-"}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Profesional responsable</span>
          <strong className="lf1viewer__metaValue">{profesional}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Patologia relacionada</span>
          <strong className="lf1viewer__metaValue">{patologiaLabel}</strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Nivel de limitacion para moverse</span>
          <strong className="lf1viewer__metaValue">
            {formatLimitacion(row.limitacion_moverse)}
          </strong>
        </article>
        {row.adicional_no_puede ? (
          <article className="lf1viewer__metaCard">
            <span className="lf1viewer__metaLabel">
              Actividad adicional que no puede realizar
            </span>
            <strong className="lf1viewer__metaValue">{row.adicional_no_puede}</strong>
          </article>
        ) : null}
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Ultima vez que realizo actividades</span>
          <strong className="lf1viewer__metaValue">
            {formatUltimaVez(row.ultima_vez)}
          </strong>
        </article>
        <article className="lf1viewer__metaCard">
          <span className="lf1viewer__metaLabel">Factor principal que limita al paciente</span>
          <strong className="lf1viewer__metaValue">
            {formatQueImpide(row.que_impide)}
          </strong>
        </article>
        <article className="lf1viewer__metaCard lf1viewer__metaCard--span2">
          <span className="lf1viewer__metaLabel">Actividades afectadas reportadas</span>
          <strong className="lf1viewer__metaValue">{actividadesLabel}</strong>
        </article>
      </div>

      <p className="lf1viewer__sectionLabel">Resumen narrativo clinico</p>
      <p className="lf1viewer__narrativa">{narrativa}</p>

      <p className="lf1viewer__sectionLabel">Plan de seguimiento: sintomas y objetivos</p>
      <div className="lf1viewer__tableWrap">
        <table className="lf1viewer__table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Sintoma funcional identificado</th>
              <th>Objetivo definido para el seguimiento</th>
            </tr>
          </thead>
          <tbody>
            {filasSintomas.length ? (
              filasSintomas.map((item, idx) => (
                <tr key={item.numero}>
                  <td>{idx + 1}</td>
                  <td>{item.sintoma}</td>
                  <td>{item.objetivo}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>Sin sintomas registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {row.objetivo_extra && !row.otro_sintoma ? (
        <div className="lf1viewer__note">
          <span className="lf1viewer__metaLabel">Objetivo extra</span>
          <strong className="lf1viewer__metaValue">{row.objetivo_extra}</strong>
        </div>
      ) : null}
    </div>
  );
}
