import {
  formatPatologiaLabel,
  formatObjetivoLabel,
  formatProblemaLabel,
  textoObjetivoFormKey,
} from "../../data/encuestaLogrosCatalog";

function getSintomaLabel(value) {
  if (!value) return "-";
  return formatProblemaLabel(value) || value;
}

function parseTextosRow(raw) {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function getObjetivoLabel(sintomaValue, objetivoValue, textos = {}) {
  if (!objetivoValue) return "-";
  const detalleExterno =
    textos[sintomaValue] ||
    textos[textoObjetivoFormKey(sintomaValue)] ||
    "";
  return (
    formatObjetivoLabel(sintomaValue, objetivoValue, detalleExterno) ||
    objetivoValue
  );
}

/**
 * Misma lógica que LogrosFase1Viewer para PDF / CSV / Excel.
 */
export function buildLogrosFase1DownloadContext(row) {
  if (!row) return null;

  const pacienteNombre =
    [row.nombres, row.apellidos].filter(Boolean).join(" ") || "Paciente";

  const totalObjetivos = (() => {
    const base = [row.objetivo_1, row.objetivo_2, row.objetivo_3].filter(
      Boolean,
    ).length;
    const extra = row.objetivo_extra ? 1 : 0;
    return base + extra;
  })();

  let actividades = [];
  if (row.actividades_afectadas) {
    if (Array.isArray(row.actividades_afectadas)) {
      actividades = row.actividades_afectadas;
    } else {
      try {
        const parsed = JSON.parse(row.actividades_afectadas);
        actividades = Array.isArray(parsed) ? parsed : [];
      } catch {
        actividades = [];
      }
    }
  }

  const textos = parseTextosRow(row.textos ?? row.detalles);

  const items = [
    { numero: 1, sintomaValue: row.sintoma_1, objetivoValue: row.objetivo_1 },
    { numero: 2, sintomaValue: row.sintoma_2, objetivoValue: row.objetivo_2 },
    { numero: 3, sintomaValue: row.sintoma_3, objetivoValue: row.objetivo_3 },
  ].filter((item) => item.sintomaValue);

  const sintomasConObjetivos = items.map((item) => ({
    numero: item.numero,
    sintomaValue: item.sintomaValue,
    sintoma: getSintomaLabel(item.sintomaValue),
    objetivo: getObjetivoLabel(
      item.sintomaValue,
      item.objetivoValue,
      textos,
    ),
  }));

  const fechaRegistro = row.created_at
    ? new Date(row.created_at).toLocaleDateString("es-CO")
    : "-";

  return {
    pacienteNombre,
    fechaRegistro,
    totalObjetivos,
    row,
    patologiaLabel: formatPatologiaLabel(row.patologia_relacionada),
    actividades,
    sintomasConObjetivos,
  };
}
