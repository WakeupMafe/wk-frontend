import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#475569",
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
