import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PODIUM_COLORS } from "./ProfesionalesBarRank";

/** Soft pastels — first three match Podio de encuestadores */
const COLORS = [
  ...PODIUM_COLORS,
  "#F2C8A8", // peach
  "#9DD4C8", // soft mint-teal
  "#E8B4C8", // soft rose
  "#D4E5B8", // pale lime
  "#C5D5F0", // periwinkle
];

/**
 * Gráfico circular: distribución de encuestas de logros por sede.
 * `data`: [{ sede: string, count: number }, ...]
 */
export default function SedePieChart({ data, loading, total }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((d) => ({
      name: d.sede,
      value: d.count,
      total: total ?? 0,
    }));
  }, [data, total]);

  if (loading) {
    return (
      <div className="estad-kpi__chart-placeholder" aria-busy="true">
        …
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <p className="estad-kpi__chart-empty">
        No hay encuestas registradas por sede todavía.
      </p>
    );
  }

  const t = Number(total) || 0;

  return (
    <div className="estad-kpi__chart-wrap">
      <div className="estad-kpi__chart-pie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="88%"
              innerRadius={0}
              paddingAngle={1}
              labelLine={false}
              isAnimationActive={false}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={`cell-${chartData[i].name}`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, item) => {
                const n = Number(value);
                const tot = Number(item?.payload?.total) || 0;
                if (tot > 0) {
                  return [`${n} (${((n / tot) * 100).toFixed(1)}%)`, name];
                }
                return [String(n), name];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontFamily: '"Poppins", system-ui, sans-serif',
                fontSize: "0.78rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul
        className="estad-kpi__chart-legend"
        aria-label="Leyenda: sede y color"
      >
        {chartData.map((row, i) => {
          const pct =
            t > 0 ? ((Number(row.value) / t) * 100).toFixed(0) : "0";
          return (
            <li key={row.name} className="estad-kpi__chart-legend__item">
              <span
                className="estad-kpi__chart-legend__swatch"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                aria-hidden
              />
              <span className="estad-kpi__chart-legend__text">
                <span className="estad-kpi__chart-legend__name">{row.name}</span>
                <span className="estad-kpi__chart-legend__pct">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
