import * as XLSX from "xlsx";
import jsPDF from "jspdf";

function fmtFecha(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CO");
  } catch {
    return String(iso);
  }
}

function sintomasResumen(r) {
  const s = [r.sintoma_1, r.sintoma_2, r.sintoma_3].filter(Boolean);
  return s.join(" · ");
}

function rowsToMatrix(rows) {
  const header = [
    "Documento",
    "Nombres",
    "Apellidos",
    "Sede",
    "Síntomas",
    "Objetivos",
    "Fecha registro",
  ];
  const body = rows.map((r) => [
    r.documento ?? "",
    r.nombres ?? "",
    r.apellidos ?? "",
    r.sede ?? "",
    sintomasResumen(r),
    r.objetivos_seleccionados ?? "",
    fmtFecha(r.created_at),
  ]);
  return [header, ...body];
}

export function downloadCompendioCsv(rows, baseName = "compendio") {
  const matrix = rowsToMatrix(rows);
  const escape = (c) => {
    const t = String(c ?? "");
    if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  const lines = matrix.map((line) => line.map(escape).join(","));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCompendioXlsx(rows, baseName = "compendio") {
  const matrix = rowsToMatrix(rows);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Compendio");
  XLSX.writeFile(wb, `${baseName}.xlsx`);
}

export function downloadCompendioPdf(rows, meta, baseName = "compendio") {
  const doc = new jsPDF("l", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 12;

  doc.setFontSize(14);
  doc.text("Compendio de encuestas", margin, y);
  y += 7;

  doc.setFontSize(9);
  const filt = meta?.filtros || {};
  const sedeTxt = filt.sede || "Todas";
  const sintTxt = (filt.sintomas || []).length
    ? filt.sintomas.join(", ")
    : "Ninguno (todos los registros según sede)";
  doc.text(`Sede: ${sedeTxt}`, margin, y);
  y += 5;
  doc.text(`Síntomas (OR): ${sintTxt}`, margin, y);
  y += 5;
  doc.text(`Registros: ${rows.length}`, margin, y);
  y += 8;

  doc.setFontSize(8);
  const colW = [22, 28, 28, 22, 45, 12, 38];
  const headers = [
    "Doc.",
    "Nombres",
    "Apellidos",
    "Sede",
    "Síntomas",
    "Obj.",
    "Fecha",
  ];
  let x = margin;
  headers.forEach((h, i) => {
    doc.text(String(h), x, y, { maxWidth: colW[i] - 1 });
    x += colW[i];
  });
  y += 5;

  rows.forEach((r) => {
    if (y > 185) {
      doc.addPage();
      y = 12;
    }
    x = margin;
    const cells = [
      String(r.documento ?? ""),
      String(r.nombres ?? ""),
      String(r.apellidos ?? ""),
      String(r.sede ?? ""),
      sintomasResumen(r),
      String(r.objetivos_seleccionados ?? ""),
      fmtFecha(r.created_at),
    ];
    cells.forEach((text, i) => {
      doc.text(text, x, y, { maxWidth: colW[i] - 1 });
      x += colW[i];
    });
    y += 6;
  });

  doc.save(`${baseName}.pdf`);
}
