import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Top 3 desde `autorizados` por encuestas_realizadas (1.º arriba).
 */
export default function ProfesionalesBarRank({ data, loading }) {
  const gradId = useId().replace(/:/g, "");

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
        const short =
          label.length > 26 ? `${label.slice(0, 24).trim()}…` : label;
        return {
          etiqueta: short,
          etiquetaTooltip: tooltip || label,
          encuestas_realizadas: Number(d.encuestas_realizadas) || 0,
        };
      })
      .filter(Boolean);
    if (!norm.length) return [];
    const top3 = [...norm]
      .sort(
        (a, b) =>
          (b.encuestas_realizadas ?? 0) - (a.encuestas_realizadas ?? 0),
      )
      .slice(0, 3);
    return top3.map((row, i) => ({
      ...row,
      puesto: i + 1,
      etiqueta: `${i + 1}º  ${row.etiqueta}`,
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

  const domainMax = Math.max(maxVal, Math.ceil(maxVal * 1.12));
  const h = 210;

  return (
    <div className="estad-kpi__ranking-pro">
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 28, left: 4, bottom: 8 }}
          barCategoryGap="18%"
        >
          <defs>
            <linearGradient id={`${gradId}-b1`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id={`${gradId}-b2`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={`${gradId}-b3`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={168}
            tick={{
              fontSize: 11,
              fill: "#0f172a",
              fontWeight: 600,
              fontFamily: '"Poppins", system-ui, sans-serif',
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(241, 245, 249, 0.65)" }}
            formatter={(value) => [`${value} encuesta(s)`, "Realizadas"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.etiquetaTooltip ?? ""
            }
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.08)",
              fontFamily: '"Poppins", system-ui, sans-serif',
              fontSize: "0.8rem",
            }}
            labelStyle={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}
          />
          <Bar
            dataKey="encuestas_realizadas"
            name="Encuestas"
            radius={[0, 8, 8, 0]}
            isAnimationActive={false}
            maxBarSize={22}
          >
            {chartData.map((_, i) => (
              <Cell
                key={`rank-cell-${i}`}
                fill={`url(#${gradId}-b${i + 1})`}
              />
            ))}
            <LabelList
              dataKey="encuestas_realizadas"
              position="right"
              offset={10}
              fill="#0f172a"
              fontSize={12}
              fontWeight={700}
              fontFamily='"Poppins", system-ui, sans-serif'
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
