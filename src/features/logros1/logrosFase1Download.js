export function downloadLogrosFase1Survey({
  pacienteNombre,
  fechaRegistro,
  totalObjetivos,
  row,
  actividades,
  sintomasConObjetivos,
}) {
  const payload = {
    datos_principales: {
      nombre: pacienteNombre || null,
      documento: row?.documento || null,
      fecha_registro: fechaRegistro || null,
      profesional: row?.encuestador || null,
      total_objetivos: totalObjetivos || 0,
    },
    resultados: {
      limitacion_moverse: row?.limitacion_moverse || null,
      actividades_afectadas: actividades || [],
      sintomas_y_objetivos: sintomasConObjetivos || [],
      otro_sintoma: row?.otro_sintoma || null,
      objetivo_extra: row?.objetivo_extra || null,
      adicional_no_puede: row?.adicional_no_puede || null,
    },
    registro_crudo: row || {},
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const safeName = String(pacienteNombre || "encuesta")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  link.href = url;
  link.download = `logros_fase1_${safeName}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
