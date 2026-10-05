import { useMemo } from "react";

/** Soft sage / sky / lavender — shared with SedePieChart */
export const PODIUM_COLORS = ["#A3D19D", "#B6D0ED", "#CDC5ED"];

function CrownIcon({ fill }) {
  return (
    <svg
      className="estad-kpi__podium-crown"
      width="14"
      height="12"
      viewBox="0 0 14 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M1.2 9.6 2.4 3.8l2.6 2.4L7 1.6l2 4.6 2.6-2.4 1.2 5.8H1.2Z"
        fill={fill}
      />
      <rect x="1.1" y="9.4" width="11.8" height="1.5" rx="0.5" fill={fill} />
    </svg>
  );
}

/**
 * Top 3 desde `autorizados` por encuestas_realizadas (1.º arriba).
 * Capsule progress bars + rank badges (custom HTML to match podium mock).
 */
export default function ProfesionalesBarRank({ data, loading }) {
  const chartData = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const norm = rows
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        if (!("encuestas_realizadas" in d)) return null;
        const nom = [d.nombres, d.apellidos].filter(Boolean).join(" ").trim();
        const ced = d.cedula != null ? String(d.cedula) : "";
        const label = nom || ced || "—";
        const sede = (d.sede && String(d.sede).trim()) || "";
        const tooltip = [nom || null, sede ? `Sede: ${sede}` : null, ced ? `CC ${ced}` : null]
          .filter(Boolean)
          .join(" · ");
        return {
          name: label,
          etiquetaTooltip: tooltip || label,
          encuestas_realizadas: Number(d.encuestas_realizadas) || 0,
        };
      })
      .filter(Boolean);
    if (!norm.length) return [];
    return [...norm]
      .sort(
        (a, b) =>
          (b.encuestas_realizadas ?? 0) - (a.encuestas_realizadas ?? 0),
      )
      .slice(0, 3)
      .map((row, i) => ({
        ...row,
        puesto: i + 1,
        color: PODIUM_COLORS[i] ?? PODIUM_COLORS[PODIUM_COLORS.length - 1],
      }));
  }, [data]);

  if (loading) {
    return (
      <div className="estad-kpi__chart-placeholder estad-kpi__ranking-pro__loading" aria-busy="true">
        …
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <p className="estad-kpi__chart-empty estad-kpi__ranking-pro__empty">
        No hay datos de ranking en autorizados o todos tienen encuestas sin
        registrar.
      </p>
    );
  }

  const maxVal = Math.max(
    ...chartData.map((d) => Number(d.encuestas_realizadas) || 0),
    1,
  );

  return (
    <ol className="estad-kpi__podium" aria-label="Top 3 encuestadores">
      {chartData.map((row) => {
        const pct = Math.max(
          6,
          Math.round((Number(row.encuestas_realizadas) / maxVal) * 100),
        );
        return (
          <li
            key={`${row.puesto}-${row.name}`}
            className="estad-kpi__podium-row"
            title={row.etiquetaTooltip}
          >
            <div
              className="estad-kpi__podium-badge"
              style={{ backgroundColor: row.color }}
              aria-label={`Puesto ${row.puesto}`}
            >
              <CrownIcon fill="#5b6470" />
              <span className="estad-kpi__podium-rank">{row.puesto}</span>
            </div>
            <div className="estad-kpi__podium-body">
              <div className="estad-kpi__podium-meta">
                <span className="estad-kpi__podium-name">{row.name}</span>
                <span className="estad-kpi__podium-count">
                  {row.encuestas_realizadas}
                </span>
              </div>
              <div className="estad-kpi__podium-track" aria-hidden>
                <div
                  className="estad-kpi__podium-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
