import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiUrl } from "../../../lib/api/baseUrl";
import { toastError, toastSuccess } from "../../../lib/alerts/appAlert";
import "./AnalisisLogros.css";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + ((parts[1] || parts[0])[0] || "")).toUpperCase();
}

function Badge({ estado, label }) {
  if (!estado || !label) return <span>—</span>;
  return <span className={`al-badge al-badge--${estado}`}>{label}</span>;
}

function Donut({ pct }) {
  const value = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const angle = (value / 100) * 360;
  return (
    <div
      className="al-donut"
      style={{
        background: `conic-gradient(#3d9a6a 0deg ${angle}deg, #eef0f4 ${angle}deg 360deg)`,
      }}
      role="img"
      aria-label={
        pct == null ? "Sin porcentaje" : `${pct}% mejoró en la última encuesta`
      }
    >
      <div className="al-donut__inner">
        <span className="al-donut__pct">
          {pct == null ? "—" : `${pct}%`}
        </span>
        <span className="al-donut__caption">MEJORÓ</span>
      </div>
    </div>
  );
}

export default function AnalisisLogrosComparativa() {
  const { documento: docParam } = useParams();
  const documento = decodeURIComponent(docParam || "").trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paciente, setPaciente] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          apiUrl(
            `/encuestas/analisis-logros/paciente/${encodeURIComponent(documento)}`,
          ),
        );
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            json?.detail?.error ||
              json?.detail ||
              `Error ${res.status}`,
          );
        }
        if (!cancelled) setPaciente(json.paciente);
      } catch (e) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setPaciente(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (documento) run();
    return () => {
      cancelled = true;
    };
  }, [documento]);

  const descargarExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/encuestas/analisis-logros/paciente/${encodeURIComponent(documento)}/excel`,
        ),
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.detail?.error || json?.detail || `Error ${res.status}`,
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analisis_logros_${documento}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess({ title: "Excel del paciente listo" });
    } catch (e) {
      toastError({
        title: "No se pudo descargar",
        text: String(e?.message || e),
      });
    } finally {
      setDownloading(false);
    }
  };

  const conteos = paciente?.resumen_ultima?.conteos;
  const cambio = paciente?.cambio_desde_e2;

  const timelineSlots = useMemo(() => {
    const tl = paciente?.timeline || [];
    const byFase = new Map(tl.map((t) => [t.fase, t]));
    return [1, 2, 3].map((fase) => byFase.get(fase) || null);
  }, [paciente]);

  if (loading) {
    return (
      <div className="al-page">
        <p className="al-loading">Cargando comparativa…</p>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div className="al-page">
        <nav className="al-crumb">
          <Link to="/estadisticas/analisis-logros">Análisis de logros</Link>
          <span>›</span>
          <span>Paciente</span>
        </nav>
        <p className="al-error" role="alert">
          {error || "Paciente no encontrado"}
        </p>
      </div>
    );
  }

  return (
    <div className="al-page estad-page">
      <nav className="al-crumb" aria-label="Miga de pan">
        <Link to="/estadisticas/analisis-logros">Análisis de logros</Link>
        <span>›</span>
        <span>{paciente.nombre_completo}</span>
      </nav>

      <section className="al-profile">
        <div className="al-profile__left">
          <span className="al-avatar al-profile__avatar" aria-hidden>
            {initials(paciente.nombre_completo)}
          </span>
          <div>
            <h1 className="al-page__title" style={{ fontSize: "1.25rem" }}>
              {paciente.nombre_completo}
            </h1>
            <div className="al-profile__meta">
              <span>{paciente.documento_display || paciente.documento}</span>
              <span>{paciente.sede || "Sin sede"}</span>
              <span>{paciente.plan || "Sin plan"}</span>
              {paciente.profesional_nombre ? (
                <span>Profesional: {paciente.profesional_nombre}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="al-profile__actions">
          <button
            type="button"
            className="al-btn al-btn--outline"
            onClick={descargarExcel}
            disabled={downloading}
          >
            {downloading ? "Generando…" : "Excel del paciente"}
          </button>
          <button
            type="button"
            className="al-btn al-btn--primary"
            disabled
            title="PDF opcional: pendiente"
          >
            Descargar PDF
          </button>
        </div>
      </section>

      <section className="al-timeline" aria-label="Línea de tiempo">
        <div className="al-timeline__head">
          <h2 className="al-timeline__title">Línea de tiempo</h2>
          <span className="al-timeline__count">
            {paciente.encuestas?.total || 0} encuestas ·{" "}
            {paciente.num_objetivos} objetivos
          </span>
        </div>
        <div className="al-timeline__track">
          {timelineSlots.map((slot, idx) => {
            const fase = idx + 1;
            if (!slot) {
              return (
                <div key={fase} className="al-tl-item" style={{ opacity: 0.35 }}>
                  <div className="al-tl-item__dot" />
                  <p className="al-tl-item__title">Encuesta {fase}</p>
                  <p className="al-tl-item__sub">Sin registro</p>
                </div>
              );
            }
            return (
              <div key={fase} className="al-tl-item">
                <div className="al-tl-item__dot" />
                <p className="al-tl-item__title">{slot.titulo}</p>
                <p className="al-tl-item__date">{slot.fecha_display}</p>
                <p className="al-tl-item__sub">{slot.subtitulo}</p>
                {slot.fase === 1 ? (
                  <p className="al-tl-item__stats">
                    {paciente.num_objetivos} objetivos definidos
                  </p>
                ) : slot.conteos ? (
                  <p className="al-tl-item__stats">
                    {slot.conteos.mejoro} mejoró · {slot.conteos.igual} igual ·{" "}
                    {slot.conteos.desmejoro} desmejoró
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="al-comp-grid">
        <aside className="al-summary">
          <Donut pct={paciente.resumen_ultima?.pct_mejoro} />
          {cambio ? (
            <div className="al-cambio">
              <strong>Cambio desde la Encuesta 2</strong>
              <p style={{ margin: "0.35rem 0 0" }}>
                {cambio.avanzaron} objetivos avanzaron y {cambio.retrocedieron}{" "}
                retrocedieron respecto al primer seguimiento.
              </p>
              <div className="al-cambio__pills">
                <span className="al-mini-pill al-mini-pill--up">
                  ↑ {cambio.avanzaron} avanzaron
                </span>
                <span className="al-mini-pill al-mini-pill--down">
                  ↓ {cambio.retrocedieron} retrocedieron
                </span>
              </div>
            </div>
          ) : null}
          <ul className="al-legend">
            <li>
              <span>
                <span
                  className="al-legend__dot"
                  style={{ background: "#3d9a6a" }}
                />
                Mejoró
              </span>
              <strong>{conteos?.mejoro ?? 0}</strong>
            </li>
            <li>
              <span>
                <span
                  className="al-legend__dot"
                  style={{ background: "#e0b45a" }}
                />
                Se mantuvo igual
              </span>
              <strong>{conteos?.igual ?? 0}</strong>
            </li>
            <li>
              <span>
                <span
                  className="al-legend__dot"
                  style={{ background: "#c45a6a" }}
                />
                Desmejoró
              </span>
              <strong>{conteos?.desmejoro ?? 0}</strong>
            </li>
          </ul>
          <div
            className={`al-tend-box al-tend-box--${paciente.tendencia}`}
          >
            <strong>Tendencia general · {paciente.tendencia_label}</strong>
            {paciente.tendencia_explicacion}
          </div>
        </aside>

        <section className="al-matrix" aria-label="Objetivos uno a uno">
          <div className="al-matrix__head">
            <h2 className="al-matrix__title">Objetivos, uno a uno</h2>
            <div className="al-matrix__legend">
              <span className="al-badge al-badge--mejoro">Mejoró</span>
              <span className="al-badge al-badge--igual">Igual</span>
              <span className="al-badge al-badge--desmejoro">Desmejoró</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Objetivo (Encuesta 1)</th>
                <th>
                  Encuesta 2
                  {paciente.fecha_e2
                    ? ` · ${paciente.timeline?.find((t) => t.fase === 2)?.fecha_display || ""}`
                    : ""}
                </th>
                <th>
                  Encuesta 3
                  {paciente.fecha_e3
                    ? ` · ${paciente.timeline?.find((t) => t.fase === 3)?.fecha_display || ""}`
                    : ""}
                </th>
                <th>Última observación</th>
              </tr>
            </thead>
            <tbody>
              {(paciente.objetivos || []).map((o) => (
                <tr key={o.orden}>
                  <td>{String(o.orden).padStart(2, "0")}</td>
                  <td>{o.objetivo_e1}</td>
                  <td>
                    {paciente.tiene_e2 || paciente.encuestas?.e2 ? (
                      <Badge
                        estado={o.estado_e2}
                        label={o.estado_e2_label}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {paciente.tiene_e3 || paciente.encuestas?.e3 ? (
                      <Badge
                        estado={o.estado_e3}
                        label={o.estado_e3_label}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{o.ultima_observacion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
