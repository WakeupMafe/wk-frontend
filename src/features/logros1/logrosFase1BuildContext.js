import {
  PROBLEMAS as SINTOMAS,
  OBJETIVOS,
} from "../../data/encuestaLogrosCatalog";

function getSintomaLabel(value) {
  if (!value) return "-";
  const found = SINTOMAS.find((s) => s.value === value);
  return found?.label || value;
}

function getObjetivoLabel(sintomaValue, objetivoValue) {
  if (!objetivoValue) return "-";
  const meta = OBJETIVOS[sintomaValue];
  if (!meta) return objetivoValue;
  const found = meta.opciones?.find((o) => o.value === objetivoValue);
  return found?.label || objetivoValue;
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

  const items = [
    { numero: 1, sintomaValue: row.sintoma_1, objetivoValue: row.objetivo_1 },
    { numero: 2, sintomaValue: row.sintoma_2, objetivoValue: row.objetivo_2 },
    { numero: 3, sintomaValue: row.sintoma_3, objetivoValue: row.objetivo_3 },
  ].filter((item) => item.sintomaValue);

  const sintomasConObjetivos = items.map((item) => ({
    numero: item.numero,
    sintoma: getSintomaLabel(item.sintomaValue),
    objetivo: getObjetivoLabel(item.sintomaValue, item.objetivoValue),
  }));

  const fechaRegistro = row.created_at
    ? new Date(row.created_at).toLocaleDateString("es-CO")
    : "-";

  return {
    pacienteNombre,
    fechaRegistro,
    totalObjetivos,
    row,
    actividades,
    sintomasConObjetivos,
  };
}
