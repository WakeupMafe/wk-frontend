function csvEscape(s) {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function rowCsv(cells) {
  return cells.map(csvEscape).join(",");
}

/**
 * Exporta encuesta Logros Fase 1 como CSV (UTF-8 con BOM para Excel).
 */
export function downloadLogrosFase1Csv(ctx) {
  if (!ctx?.row) return;

  const {
    pacienteNombre,
    fechaRegistro,
    totalObjetivos,
    row,
    actividades,
    sintomasConObjetivos,
  } = ctx;

  const lines = [];

  lines.push(rowCsv(["Sección", "Campo", "Valor"]));
  lines.push(rowCsv(["Datos principales", "Nombre", pacienteNombre]));
  lines.push(rowCsv(["Datos principales", "Documento", row.documento ?? ""]));
  lines.push(rowCsv(["Datos principales", "Fecha registro", fechaRegistro]));
  lines.push(
    rowCsv([
      "Datos principales",
      "Profesional (documento)",
      row.encuestador ?? "",
    ]),
  );
  lines.push(rowCsv(["Datos principales", "Sede", row.sede ?? ""]));
  lines.push(rowCsv(["Datos principales", "Total objetivos", totalObjetivos]));

  lines.push(
    rowCsv([
      "Resultados",
      "Limitación para moverse",
      row.limitacion_moverse ?? "",
    ]),
  );
  lines.push(
    rowCsv([
      "Resultados",
      "Actividades afectadas",
      Array.isArray(actividades) ? actividades.join("; ") : "",
    ]),
  );
  lines.push(
    rowCsv(["Resultados", "Última vez", row.ultima_vez ?? ""]),
  );
  lines.push(
    rowCsv([
      "Resultados",
      "Qué impide",
      Array.isArray(row.que_impide)
        ? row.que_impide.join("; ")
        : String(row.que_impide ?? ""),
    ]),
  );
  lines.push(rowCsv(["Resultados", "Otro síntoma", row.otro_sintoma ?? ""]));
  lines.push(rowCsv(["Resultados", "Objetivo extra", row.objetivo_extra ?? ""]));

  sintomasConObjetivos.forEach((it) => {
    lines.push(
      rowCsv([
        "Síntomas y objetivos",
        `#${it.numero} ${it.sintoma}`,
        it.objetivo,
      ]),
    );
  });

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });

  const safeName = String(pacienteNombre || "encuesta")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `logros_fase1_${safeName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
