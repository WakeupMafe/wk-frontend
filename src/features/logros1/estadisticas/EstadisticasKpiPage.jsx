import { useEffect, useState } from "react";
import {
  ErrorText,
  KpiLabel,
  KpiValue,
  PageHeader,
  PageLead,
  PageMeta,
  PageTitle,
} from "../../../components/typography";
import SedePieChart from "./SedePieChart";
import ProfesionalesBarRank from "./ProfesionalesBarRank";
import "./EstadisticasKpiPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Logs en consola en local (Vite dev o hostname localhost/127.0.0.1) */
function debugEstadisticas(label, payload) {
  const local =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname));
  if (local) {
    console.log(`[estadísticas KPI] ${label}`, payload);
  }
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Dashboard: tarjetas KPI (misma cabecera que Filtros / Resultados).
 * El ranking viene en `ranking_autorizados` desde `/encuestas/estadisticas-generales` (tabla autorizados).
 */
export default function EstadisticasKpiPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const url = `${API_URL}/encuestas/estadisticas-generales`;
        debugEstadisticas("GET", { url, API_URL });
        const res = await fetch(url);
        const rawText = await res.text();
        let json = {};
        try {
          json = rawText ? JSON.parse(rawText) : {};
        } catch (parseErr) {
          debugEstadisticas("JSON inválido", {
            status: res.status,
            ok: res.ok,
            rawText: rawText?.slice?.(0, 500),
            parseErr: String(parseErr),
          });
          throw new Error("La respuesta del servidor no es JSON válido");
        }
        const keys =
          json && typeof json === "object" && !Array.isArray(json)
            ? Object.keys(json)
            : [];
        const rank = json?.ranking_autorizados;
        const tieneClaveRanking = Object.prototype.hasOwnProperty.call(
          json,
          "ranking_autorizados",
        );
        debugEstadisticas("respuesta HTTP", {
          status: res.status,
          ok: res.ok,
          keys,
          tiene_ranking_autorizados: tieneClaveRanking,
          ranking_filas: Array.isArray(rank) ? rank.length : null,
        });
        if (!res.ok) {
          const d = json?.detail;
          const msg =
            typeof d === "string"
              ? d
              : d && typeof d === "object"
                ? JSON.stringify(d)
                : "No se pudieron cargar las estadísticas";
          debugEstadisticas("error API (body)", { detail: json?.detail, full: json });
          throw new Error(msg);
        }
        if (!tieneClaveRanking) {
          debugEstadisticas(
            "ADVERTENCIA: el JSON no trae ranking_autorizados. ¿uvicorn ejecuta este backend?",
            { keys, url },
          );
        }
        const rankingSeguro = Array.isArray(rank) ? rank : [];
        if (!cancelled) {
          setData({ ...json, ranking_autorizados: rankingSeguro });
        }
      } catch (e) {
        debugEstadisticas("catch", { error: String(e?.message || e), stack: e?.stack });
        if (!cancelled) setErr(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = data?.total ?? 0;

  return (
    <section
      className="estad-page estad-kpi-page"
      aria-labelledby="estad-kpi-title"
    >
      <PageHeader className="estad-kpi-page__header">
        <PageTitle id="estad-kpi-title">Dashboard</PageTitle>
        <PageLead>
          Resumen general de encuestas registradas en el sistema.
        </PageLead>
        <PageMeta>
          Última actualización:{" "}
          <time dateTime={data?.actualizado_en}>
            {loading ? "…" : fmtDate(data?.actualizado_en)}
          </time>
        </PageMeta>
      </PageHeader>

      <div className="estad-page__card estad-kpi-page__board">
        {err ? (
          <ErrorText className="estad-kpi__error" role="alert">
            {err}
          </ErrorText>
        ) : null}

        <div className="estad-kpi__grid">
          <article className="estad-kpi__card estad-kpi__card--hero">
            <KpiLabel>Total de Encuestas</KpiLabel>
            <KpiValue className="estad-kpi__value--hero">
              {loading ? "…" : total}
            </KpiValue>
          </article>

          <div className="estad-kpi__bento" aria-label="Indicadores y distribución por sede">
            <article className="estad-kpi__card estad-kpi__card--dolor">
              <KpiLabel>Pacientes con Dolor</KpiLabel>
              <KpiValue className="estad-kpi__value--ratio">
                {loading ? "…" : `${data?.con_dolor ?? 0}/${total || "—"}`}
              </KpiValue>
            </article>

            <article className="estad-kpi__card estad-kpi__card--tres">
              <KpiLabel>Paciente con 3 objetivos</KpiLabel>
              <KpiValue className="estad-kpi__value--ratio">
                {loading
                  ? "…"
                  : `${data?.con_tres_objetivos ?? 0}/${total || "—"}`}
              </KpiValue>
            </article>

            <article className="estad-kpi__card estad-kpi__card--ultimo">
              <KpiLabel>Encuestas en el último mes</KpiLabel>
              <KpiValue>{loading ? "…" : data?.ultimo_mes ?? 0}</KpiValue>
            </article>

            <article
              className="estad-kpi__card estad-kpi__card--ranking"
              aria-labelledby="estad-kpi-ranking-title"
              aria-describedby="estad-kpi-ranking-desc"
            >
              <div className="estad-kpi__ranking-head">
                <KpiLabel id="estad-kpi-ranking-title">
                  Podio de encuestadores
                </KpiLabel>
                <p className="estad-kpi__ranking-lead" id="estad-kpi-ranking-desc">
                  Top 3 por volumen de encuestas aplicadas (tabla autorizados).
                </p>
              </div>
              <div className="estad-kpi__ranking-wrap">
                <ProfesionalesBarRank
                  data={data?.ranking_autorizados}
                  loading={loading}
                />
              </div>
            </article>

            <article
              className="estad-kpi__card estad-kpi__card--chart"
              aria-labelledby="estad-kpi-sede-title"
            >
              <KpiLabel id="estad-kpi-sede-title">
                Porcentaje de aplicación por sede
              </KpiLabel>
              <SedePieChart
                data={data?.por_sede}
                loading={loading}
                total={total}
              />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
