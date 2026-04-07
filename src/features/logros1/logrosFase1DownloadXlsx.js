import * as XLSX from "xlsx";

/**
 * Exporta encuesta Logros Fase 1 como .xlsx
 */
export function downloadLogrosFase1Xlsx(ctx) {
  if (!ctx?.row) return;

  const {
    pacienteNombre,
    fechaRegistro,
    totalObjetivos,
    row,
    actividades,
    sintomasConObjetivos,
  } = ctx;

  const datos = [
    ["Sección", "Campo", "Valor"],
    ["Datos principales", "Nombre", pacienteNombre],
    ["Datos principales", "Documento", row.documento ?? ""],
    ["Datos principales", "Fecha registro", fechaRegistro],
    ["Datos principales", "Profesional (documento)", row.encuestador ?? ""],
    ["Datos principales", "Sede", row.sede ?? ""],
    ["Datos principales", "Total objetivos", totalObjetivos],
    ["Resultados", "Limitación para moverse", row.limitacion_moverse ?? ""],
    [
      "Resultados",
      "Actividades afectadas",
      Array.isArray(actividades) ? actividades.join("; ") : "",
    ],
    ["Resultados", "Última vez", row.ultima_vez ?? ""],
    [
      "Resultados",
      "Qué impide",
      Array.isArray(row.que_impide)
        ? row.que_impide.join("; ")
        : String(row.que_impide ?? ""),
    ],
    ["Resultados", "Otro síntoma", row.otro_sintoma ?? ""],
    ["Resultados", "Objetivo extra", row.objetivo_extra ?? ""],
  ];

  sintomasConObjetivos.forEach((it) => {
    datos.push([
      "Síntomas y objetivos",
      `#${it.numero} ${it.sintoma}`,
      it.objetivo,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Encuesta");

  const safeName = String(pacienteNombre || "encuesta")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  XLSX.writeFile(wb, `logros_fase1_${safeName}.xlsx`);
}
