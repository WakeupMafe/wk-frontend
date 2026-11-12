/**
 * Excel server-side para Análisis de logros.
 * Hojas: Resumen | Por paciente | Detalle objetivos
 * Brand header #8E7CC8, freeze, autofilter, fechas DD/MM/YYYY.
 */

import ExcelJS from "exceljs";
import {
  ESTADO_LABEL_CORTO,
  TENDENCIA_LABEL,
  formatDocumentoDisplay,
  formatFechaDDMMYYYY,
  type PacienteLogrosAnalisis,
  type KpisLogros,
  aggregateKpis,
} from "./analisisLogros";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF8E7CC8" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  name: "Calibri",
  size: 11,
};

const FILL_MEJORA: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC6EFCE" },
};
const FILL_ESTABLE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFEB9C" },
};
const FILL_DESMEJORA: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
};

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }
}

function tendenciaFill(t: string): ExcelJS.Fill | undefined {
  if (t === "mejora_general" || t === "Mejora general") return FILL_MEJORA;
  if (t === "estable" || t === "Estable") return FILL_ESTABLE;
  if (t === "desmejora" || t === "Desmejora") return FILL_DESMEJORA;
  return undefined;
}

function estadoFill(label: string): ExcelJS.Fill | undefined {
  if (label === "Mejoró") return FILL_MEJORA;
  if (label === "Igual" || label === "Se mantuvo igual") return FILL_ESTABLE;
  if (label === "Desmejoró") return FILL_DESMEJORA;
  return undefined;
}

function applyAutofilterFreeze(ws: ExcelJS.Worksheet, headerRow: number, cols: number) {
  ws.views = [{ state: "frozen", ySplit: headerRow, activeCell: "A1" }];
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: cols },
  };
}

function addResumenSheet(
  wb: ExcelJS.Workbook,
  pacientes: PacienteLogrosAnalisis[],
  kpis: KpisLogros,
  meta: { generado: string; filtros: string },
) {
  const ws = wb.addWorksheet("Resumen", {
    properties: { defaultColWidth: 28 },
  });
  ws.addRow(["Análisis de logros — Wakeup Seguimiento"]);
  ws.getRow(1).font = { bold: true, size: 14, color: { argb: "FF5B4B8A" } };
  ws.addRow([`Generado: ${meta.generado}`]);
  ws.addRow([`Filtros: ${meta.filtros}`]);
  ws.addRow([]);
  ws.addRow(["Indicador", "Valor"]);
  styleHeaderRow(ws.getRow(5), 2);

  const rows: [string, string | number][] = [
    ["Pacientes con seguimiento", kpis.pacientes_con_seguimiento],
    ["  · Mejora general", kpis.pacientes_mejora_general],
    ["  · Estables", kpis.pacientes_estables],
    ["  · Desmejora", kpis.pacientes_desmejora],
    ["Pacientes sin seguimiento (solo E1)", kpis.pacientes_sin_seguimiento],
    ["Objetivos evaluados (última encuesta)", kpis.objetivos_evaluados],
    ["Objetivos que mejoraron", kpis.objetivos_mejoro],
    ["Objetivos iguales", kpis.objetivos_igual],
    ["Objetivos que desmejoraron", kpis.objetivos_desmejoro],
    [
      "% mejora (sobre evaluados)",
      kpis.pct_mejoro == null ? "—" : `${kpis.pct_mejoro}%`,
    ],
    [
      "% igual (sobre evaluados)",
      kpis.pct_igual == null ? "—" : `${kpis.pct_igual}%`,
    ],
    [
      "% desmejora (sobre evaluados)",
      kpis.pct_desmejoro == null ? "—" : `${kpis.pct_desmejoro}%`,
    ],
    ["Pacientes en este archivo", pacientes.length],
  ];
  for (const [k, v] of rows) ws.addRow([k, v]);

  ws.addRow([]);
  ws.addRow(["Cómo leer este reporte"]);
  ws.getRow(ws.rowCount).font = { bold: true };
  const notas = [
    "E1 = levantamiento de objetivos (sin calificación de avance).",
    "E2 / E3 = seguimientos. El estado compara el avance respecto al objetivo de E1 (en E2) o al objetivo vigente del ítem (en E3 se registra la evolución clínica del seguimiento).",
    "Mapeo: mejora_sustancial y mejora_parcial → Mejoró; sin_cambio_clinico_relevante → Igual; desmejoria → Desmejoró. Objetivos sin evaluar se excluyen de % y tendencia.",
    "Tendencia general: Mejora general si #mejoró > #desmejoró; Desmejora si lo contrario; Estable si son iguales.",
    "Los % del Resumen son la suma de objetivos evaluados de todos los pacientes (no el promedio de % individuales).",
    "Hoja «Por paciente»: una fila por paciente (última encuesta). Hoja «Detalle objetivos»: una fila por objetivo × encuesta de seguimiento (E2/E3).",
  ];
  for (const n of notas) ws.addRow([n]);
  ws.getColumn(1).width = 48;
  ws.getColumn(2).width = 18;
}

function addPorPacienteSheet(
  wb: ExcelJS.Workbook,
  pacientes: PacienteLogrosAnalisis[],
) {
  const ws = wb.addWorksheet("Por paciente");
  const headers = [
    "Documento",
    "Nombre",
    "Sede",
    "Plan",
    "Encuestas",
    "Fecha E1",
    "Fecha E2",
    "Fecha E3",
    "Objetivos",
    "Mejoró",
    "Igual",
    "Desmejoró",
    "% mejora",
    "Tendencia general",
  ];
  ws.addRow(headers);
  styleHeaderRow(ws.getRow(1), headers.length);

  for (const p of pacientes) {
    const pct =
      p.pct_mejora_ultima == null ? "—" : `${p.pct_mejora_ultima}%`;
    const row = ws.addRow([
      formatDocumentoDisplay(p.documento),
      p.nombre_completo,
      p.sede || "—",
      p.plan || "—",
      p.num_encuestas,
      formatFechaDDMMYYYY(p.fecha_e1),
      formatFechaDDMMYYYY(p.fecha_e2),
      p.fecha_e3 ? formatFechaDDMMYYYY(p.fecha_e3) : "—",
      p.num_objetivos,
      p.conteos_ultima.mejoro,
      p.conteos_ultima.igual,
      p.conteos_ultima.desmejoro,
      pct,
      p.tendencia_label,
    ]);
    row.getCell(1).numFmt = "@";
    const fill = tendenciaFill(p.tendencia);
    if (fill) row.getCell(14).fill = fill;
  }

  applyAutofilterFreeze(ws, 1, headers.length);
  const widths = [16, 28, 14, 14, 10, 12, 12, 12, 10, 10, 10, 12, 10, 16];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function addDetalleSheet(
  wb: ExcelJS.Workbook,
  pacientes: PacienteLogrosAnalisis[],
) {
  const ws = wb.addWorksheet("Detalle objetivos");
  const headers = [
    "Documento",
    "Nombre",
    "Sede",
    "Plan",
    "N.º obj.",
    "Objetivo (levantado en E1)",
    "Encuesta",
    "Fecha encuesta",
    "Estado",
    "Observación",
  ];
  ws.addRow(headers);
  styleHeaderRow(ws.getRow(1), headers.length);

  for (const p of pacientes) {
    for (const obj of p.objetivos) {
      if (p.tiene_e2 && obj.estado_e2) {
        const label = ESTADO_LABEL_CORTO[obj.estado_e2];
        const row = ws.addRow([
          formatDocumentoDisplay(p.documento),
          p.nombre_completo,
          p.sede || "—",
          p.plan || "—",
          obj.orden,
          obj.objetivo_e1,
          "Encuesta 2",
          formatFechaDDMMYYYY(p.fecha_e2),
          label,
          obj.observacion_e2 || "—",
        ]);
        row.getCell(1).numFmt = "@";
        const fill = estadoFill(label);
        if (fill) row.getCell(9).fill = fill;
      }
      if (p.tiene_e3 && obj.estado_e3) {
        const label = ESTADO_LABEL_CORTO[obj.estado_e3];
        const row = ws.addRow([
          formatDocumentoDisplay(p.documento),
          p.nombre_completo,
          p.sede || "—",
          p.plan || "—",
          obj.orden,
          obj.objetivo_e1,
          "Encuesta 3",
          formatFechaDDMMYYYY(p.fecha_e3),
          label,
          obj.observacion_e3 || "—",
        ]);
        row.getCell(1).numFmt = "@";
        const fill = estadoFill(label);
        if (fill) row.getCell(9).fill = fill;
      }
    }
  }

  applyAutofilterFreeze(ws, 1, headers.length);
  const widths = [16, 28, 14, 14, 10, 40, 14, 14, 12, 36];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

export async function buildAnalisisWorkbook(
  pacientes: PacienteLogrosAnalisis[],
  opts?: { filtrosTexto?: string; kpis?: KpisLogros },
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Wakeup Seguimiento";
  wb.created = new Date();
  const kpis = opts?.kpis ?? aggregateKpis(pacientes);
  const generado = formatFechaDDMMYYYY(new Date().toISOString());
  addResumenSheet(wb, pacientes, kpis, {
    generado,
    filtros: opts?.filtrosTexto || "—",
  });
  addPorPacienteSheet(wb, pacientes);
  addDetalleSheet(wb, pacientes);
  return wb.xlsx.writeBuffer();
}

export function filtrosTextoResumen(f: {
  sede?: string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  plan?: string | null;
  q?: string | null;
  min_encuestas?: number;
}): string {
  const parts = [
    `Sede: ${f.sede?.trim() || "Todas"}`,
    `Desde: ${f.fecha_desde || "—"}`,
    `Hasta: ${f.fecha_hasta || "—"}`,
    `Plan: ${f.plan?.trim() || "Todos"}`,
    `Min. encuestas: ${f.min_encuestas ?? 2}`,
  ];
  if (f.q?.trim()) parts.push(`Buscar: ${f.q.trim()}`);
  return parts.join(" · ");
}

export { TENDENCIA_LABEL };
