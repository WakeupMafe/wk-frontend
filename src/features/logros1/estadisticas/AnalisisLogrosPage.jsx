import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../../../lib/api/baseUrl";
import { readAutorizadoCache } from "../../../lib/autorizadoPerfilEvents";
import { toastError, toastSuccess } from "../../../lib/alerts/appAlert";
import "./AnalisisLogros.css";

const SEDES = [
  { value: "", label: "Todas" },
  { value: "Poblado", label: "Poblado" },
  { value: "Laureles", label: "Laureles" },
  { value: "Barranquilla", label: "Barranquilla" },
];

function yearStartIso() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  const a = parts[0][0] || "";
  const b = (parts[1] || parts[0])[0] || "";
  return (a + b).toUpperCase();
}

function ResultBar({ mejoro, igual, desmejoro }) {
  const total = (mejoro || 0) + (igual || 0) + (desmejoro || 0);
  if (total <= 0) {
    return <span className="al-bar__nums">—</span>;
  }
  return (
    <div className="al-bar" aria-label="Resultado última encuesta">
      <div className="al-bar__track">
        {mejoro > 0 ? (
          <span
            className="al-bar__seg al-bar__seg--mejoro"
            style={{ width: `${(mejoro / total) * 100}%` }}
          />
        ) : null}
        {igual > 0 ? (
          <span
            className="al-bar__seg al-bar__seg--igual"
            style={{ width: `${(igual / total) * 100}%` }}
          />
        ) : null}
        {desmejoro > 0 ? (
          <span
            className="al-bar__seg al-bar__seg--desmejoro"
            style={{ width: `${(desmejoro / total) * 100}%` }}
          />
        ) : null}
      </div>
      <span className="al-bar__nums">
        {mejoro} · {igual} · {desmejoro}
      </span>
    </div>
  );
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  return q.toString();
}

export default function AnalisisLogrosPage() {
  const navigate = useNavigate();
  const [sede, setSede] = useState("");
  const [desde, setDesde] = useState(yearStartIso);
  const [hasta, setHasta] = useState(todayIso);
  const [plan, setPlan] = useState("");
  const [q, setQ] = useState("");
  const [soloSeguimiento, setSoloSeguimiento] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const pageSize = 20;

  const filtrosActivos = useMemo(() => {
    const chips = [];
    chips.push({ key: "sede", label: `Sede: ${sede || "Todas"}` });
    if (desde || hasta) {
      const y = (desde || "").slice(0, 4) || (hasta || "").slice(0, 4) || "—";
      chips.push({ key: "periodo", label: `Periodo: ${y}` });
    }
    chips.push({
      key: "min",
      label: `Min. encuestas: ${soloSeguimiento ? 2 : 1}`,
    });
    if (plan) chips.push({ key: "plan", label: `Plan: ${plan}` });
    if (q.trim()) chips.push({ key: "q", label: `Buscar: ${q.trim()}` });
    return chips;
  }, [sede, desde, hasta, soloSeguimiento, plan, q]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery({
        sede: sede || undefined,
        fecha_desde: desde || undefined,
        fecha_hasta: hasta || undefined,
        plan: plan || undefined,
        q: q.trim() || undefined,
        min_encuestas: soloSeguimiento ? 2 : 1,
        page,
        page_size: pageSize,
      });
      const res = await fetch(apiUrl(`/encuestas/analisis-logros?${qs}`));
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json?.detail?.error ||
            json?.detail ||
            `Error ${res.status} al cargar análisis`,
        );
      }
      setData(json);
    } catch (e) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sede, desde, hasta, plan, q, soloSeguimiento, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [sede, desde, hasta, plan, q, soloSeguimiento]);

  const limpiar = () => {
    setSede("");
    setDesde(yearStartIso());
    setHasta(todayIso());
    setPlan("");
    setQ("");
    setSoloSeguimiento(true);
    setPage(1);
  };

  const descargarExcel = async () => {
    setDownloading(true);
    try {
      const qs = buildQuery({
        sede: sede || undefined,
        fecha_desde: desde || undefined,
        fecha_hasta: hasta || undefined,
        plan: plan || undefined,
        q: q.trim() || undefined,
        min_encuestas: soloSeguimiento ? 2 : 1,
        cap: 1500,
      });
      const res = await fetch(apiUrl(`/encuestas/analisis-logros/excel?${qs}`));
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
      a.download = `analisis_logros_${todayIso()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess({ title: "Excel descargado" });
    } catch (e) {
      toastError({
        title: "No se pudo descargar",
        text: String(e?.message || e),
      });
    } finally {
      setDownloading(false);
    }
  };

  const kpis = data?.kpis;
  const pacientes = data?.pacientes || [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const auth = readAutorizadoCache();

  return (
    <div className="al-page estad-page">
      <div className="al-page__head">
        <div className="al-page__head-text">
          <h1 className="al-page__title">Análisis de logros</h1>
          <p className="al-page__lead">
            Compara, paciente a paciente, si cada objetivo levantado en la
            Encuesta 1 mejoró, se mantuvo igual o desmejoró en los seguimientos
            2 y 3.
          </p>
        </div>
        <button
          type="button"
          className="al-btn al-btn--primary"
          onClick={descargarExcel}
          disabled={downloading || loading}
        >
          {downloading ? "Generando…" : "Descargar Excel"}
        </button>
      </div>

      <section className="al-filters" aria-label="Filtros">
        <div className="al-filters__grid">
          <label className="al-field">
            <span className="al-field__label">Sede</span>
            <select
              className="al-field__control"
              value={sede}
              onChange={(e) => setSede(e.target.value)}
            >
              {SEDES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="al-field">
            <span className="al-field__label">Desde</span>
            <input
              type="date"
              className="al-field__control"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label className="al-field">
            <span className="al-field__label">Hasta</span>
            <input
              type="date"
              className="al-field__control"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
          <label className="al-field">
            <span className="al-field__label">Plan</span>
            <select
              className="al-field__control"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              title="Aún no hay columna plan en la base de datos"
            >
              <option value="">Todos</option>
            </select>
          </label>
          <label className="al-field">
            <span className="al-field__label">Buscar</span>
            <input
              type="search"
              className="al-field__control"
              placeholder="Nombre o documento"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="al-toggle">
            <input
              type="checkbox"
              checked={soloSeguimiento}
              onChange={(e) => setSoloSeguimiento(e.target.checked)}
            />
            Solo con 2 o más encuestas
          </label>
        </div>
        <div className="al-chips">
          {filtrosActivos.map((c) => (
            <span key={c.key} className="al-chip">
              {c.label}
            </span>
          ))}
          <button type="button" className="al-btn al-btn--ghost" onClick={limpiar}>
            Limpiar filtros
          </button>
        </div>
        {auth?.sede ? (
          <p className="al-kpi__sub" style={{ margin: 0 }}>
            Sesión: {auth.usuario || "Usuario"} · sede {auth.sede}
          </p>
        ) : null}
      </section>

      {kpis ? (
        <section className="al-kpis" aria-label="Indicadores">
          <article className="al-kpi">
            <p className="al-kpi__label">Pacientes con seguimiento</p>
            <p className="al-kpi__value">{kpis.pacientes_con_seguimiento}</p>
            <p className="al-kpi__sub">
              {kpis.pacientes_mejora_general} con mejora general ·{" "}
              {kpis.pacientes_estables} estables · {kpis.pacientes_desmejora}{" "}
              desmejora
            </p>
          </article>
          <article className="al-kpi al-kpi--mejoro">
            <p className="al-kpi__label">Objetivos que mejoraron</p>
            <p className="al-kpi__value">
              {kpis.pct_mejoro == null ? "—" : `${kpis.pct_mejoro}%`}
            </p>
            <p className="al-kpi__sub">
              {kpis.objetivos_mejoro} de {kpis.objetivos_evaluados} objetivos
              (última encuesta)
            </p>
          </article>
          <article className="al-kpi al-kpi--igual">
            <p className="al-kpi__label">Se mantuvo igual</p>
            <p className="al-kpi__value">
              {kpis.pct_igual == null ? "—" : `${kpis.pct_igual}%`}
            </p>
            <p className="al-kpi__sub">
              {kpis.objetivos_igual} de {kpis.objetivos_evaluados} objetivos
            </p>
          </article>
          <article className="al-kpi al-kpi--desmejoro">
            <p className="al-kpi__label">Desmejoró</p>
            <p className="al-kpi__value">
              {kpis.pct_desmejoro == null ? "—" : `${kpis.pct_desmejoro}%`}
            </p>
            <p className="al-kpi__sub">
              {kpis.objetivos_desmejoro} de {kpis.objetivos_evaluados} objetivos
            </p>
          </article>
        </section>
      ) : null}

      <section className="al-table-wrap" aria-label="Resultados">
        {loading ? (
          <p className="al-loading">Cargando análisis…</p>
        ) : error ? (
          <p className="al-error" role="alert">
            {typeof error === "string" ? error : "Error al cargar"}
          </p>
        ) : pacientes.length === 0 ? (
          <p className="al-empty">
            No hay pacientes con los filtros actuales. Prueba ampliar el rango
            de fechas o desactivar «Solo con 2 o más encuestas».
          </p>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Sede</th>
                <th>Plan</th>
                <th>Encuestas</th>
                <th>Última</th>
                <th>Resultado (última)</th>
                <th>Tendencia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.documento}>
                  <td>
                    <div className="al-patient">
                      <span className="al-avatar" aria-hidden>
                        {initials(p.nombre_completo)}
                      </span>
                      <div>
                        <div className="al-patient__name">
                          {p.nombre_completo}
                        </div>
                        <div className="al-patient__doc">
                          {p.documento_display || p.documento}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="al-sede-dot" aria-hidden />
                    {p.sede || "—"}
                  </td>
                  <td>{p.plan || "—"}</td>
                  <td>
                    <div className="al-enc-chips">
                      {(p.encuestas?.labels || []).map((l) => (
                        <span key={l} className="al-enc-chip">
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{p.ultima_fecha_display || "—"}</td>
                  <td>
                    <ResultBar
                      mejoro={p.resultado_ultima?.mejoro}
                      igual={p.resultado_ultima?.igual}
                      desmejoro={p.resultado_ultima?.desmejoro}
                    />
                  </td>
                  <td>
                    <span className={`al-pill al-pill--${p.tendencia}`}>
                      {p.tendencia_label}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="al-btn--link-row"
                      onClick={() =>
                        navigate(
                          `/estadisticas/analisis-logros/${encodeURIComponent(p.documento)}`,
                        )
                      }
                    >
                      Ver comparativa ›
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!loading && total > 0 ? (
        <div className="al-pager">
          <span>
            {total} paciente{total === 1 ? "" : "s"} · página {page} de{" "}
            {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="al-btn al-btn--outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="al-btn al-btn--outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      <p className="al-kpi__sub" style={{ margin: 0 }}>
        Tip: la mejora parcial clínica (<code>mejora_parcial</code>) se cuenta
        como «Mejoró» en este análisis.{" "}
        <Link to="/estadisticas/dashboard">Volver al dashboard</Link>
      </p>
    </div>
  );
}
