import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import Button from "../../../components/ButtonComponente";
import {
  FormLabel,
  Muted,
  PageHeader,
  PageLead,
  PageMeta,
  PageTitle,
  SectionTitle,
} from "../../../components/typography";
import {
  alertError,
  alertInfo,
  alertWarning,
  toastError,
  toastSuccess,
} from "../../../lib/alerts/appAlert";
import LogrosFase1Viewer from "../LogrosFase1Viewer";
import { buildLogrosFase1DownloadContext } from "../logrosFase1BuildContext";
import { downloadLogrosFase1Pdf } from "../logrosFase1DownloadPdf.jsx";
import { downloadLogrosFase1Csv } from "../logrosFase1DownloadCsv";
import { downloadLogrosFase1Xlsx } from "../logrosFase1DownloadXlsx";
import { NIVEL_MEJORA, getOpcionesNuevoObjetivo } from "../../logros2/logros2Catalog";
import wakeupLogoUrl from "../../../assets/logo.svg";
import "./EstadisticasFiltros.css";
import "./EstadisticasResultados.css";

import { apiUrl } from "../../../lib/api/baseUrl";

const FORMATOS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function safeItems(raw) {
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === "object");
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => x && typeof x === "object");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function itemsDesdeRegistro(registro) {
  if (!registro?.data) return [];
  const d = registro.data;
  return safeItems(d.items ?? d.payload_respuesta ?? d.respuestas);
}

function descargarBlob(nombreArchivo, contenido, mime) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function baseFilenameRegistro(registro) {
  const doc = String(registro?.data?.documento ?? "paciente").trim() || "paciente";
  const tipo = registro?.tipo === "logros2" ? "logros2" : "logros1";
  const idx = registro?.tipo_consecutivo ?? registro?.numero ?? 1;
  return `${doc}_${tipo}_${idx}`;
}

function nivelMejoraLabel(value) {
  const found = NIVEL_MEJORA.find((n) => n.value === value);
  return found?.label || String(value || "—");
}

function nuevoObjetivoLabel(item) {
  const value = String(item?.nuevo_objetivo ?? item?.objetivo_seguimiento ?? "").trim();
  if (!value) return "—";
  const sintoma = String(item?.sintoma ?? "").trim();
  const previo = String(item?.objetivo_previo_codigo ?? "").trim();
  const opciones = getOpcionesNuevoObjetivo(sintoma, previo);
  const found = opciones.find((o) => o.value === value);
  return found?.label || value;
}

function buildLogros2Narrativa(registro, items) {
  const d = registro?.data || {};
  const nombre = [d.nombres, d.apellidos].filter(Boolean).join(" ").trim() || "la persona evaluada";
  const fecha = fmtDate(registro?.created_at);
  const lim = d.limitacion_moverse_label || "sin dato";
  const acts = d.actividades_afectadas_label || "sin dato";
  const metaComp = d.meta_complementaria_previa || "";
  const patologia =
    d.patologia_relacionada_label ||
    d?.payload_origen?.patologia_fase1 ||
    "";
  const count = items.length;

  const lines = [
    `En la evaluación de seguimiento del ${fecha}, ${nombre} reportó una percepción de limitación ${lim.toLowerCase()} para desplazarse y desempeñar actividades como: ${acts}.`,
    patologia ? `Patología relacionada reportada en fase previa: ${patologia}.` : "",
    `Con base en ello se documentó la evolución clínica de ${count} ítem${count === 1 ? "" : "s"} y se definieron objetivos de seguimiento específicos.`,
    metaComp ? `Meta complementaria consignada: ${metaComp}.` : "",
  ].filter(Boolean);

  return lines.join(" ");
}

let wakeupLogoDataUrlPromise = null;
async function getWakeupLogoDataUrl() {
  if (!wakeupLogoDataUrlPromise) {
    wakeupLogoDataUrlPromise = new Promise(async (resolve) => {
      try {
        const svgText = await fetch(wakeupLogoUrl).then((r) => r.text());
        const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/png"));
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch {
        resolve(null);
      }
    });
  }
  return wakeupLogoDataUrlPromise;
}

function downloadLogros2Csv(registro) {
  const items = itemsDesdeRegistro(registro);
  const d = registro?.data || {};
  const profesionalCedula = String(d.encuestador ?? "").trim();
  const profesionalNombre = String(d.encuestador_nombre ?? "").trim();
  const profesional = profesionalCedula
    ? `${profesionalCedula}${profesionalNombre ? ` - ${profesionalNombre}` : ""}`
    : "—";
  const lines = [
    ["Documento", "Tipo", "Consecutivo", "Fecha", "Sede", "Profesional"].join(","),
    [
      registro?.data?.documento ?? "",
      "Logros 2",
      registro?.tipo_consecutivo ?? "",
      registro?.created_at ?? "",
      registro?.sede ?? "",
      profesional,
    ]
      .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
      .join(","),
    "",
    ["Slot", "Síntoma", "Nivel mejora", "Nuevo objetivo"].join(","),
  ];
  for (const it of items) {
    const row = [
      it.slot ?? "",
      it.sintoma_label ?? it.sintoma ?? "",
      it.nivel_mejora ?? "",
      it.nuevo_objetivo ?? it.objetivo_seguimiento ?? "",
    ]
      .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
      .join(",");
    lines.push(row);
  }
  descargarBlob(
    `${baseFilenameRegistro(registro)}.csv`,
    `\uFEFF${lines.join("\r\n")}`,
    "text/csv;charset=utf-8",
  );
}

function downloadLogros2Xlsx(registro) {
  const items = itemsDesdeRegistro(registro);
  const d = registro?.data || {};
  const profesionalCedula = String(d.encuestador ?? "").trim();
  const profesionalNombre = String(d.encuestador_nombre ?? "").trim();
  const profesional = profesionalCedula
    ? `${profesionalCedula}${profesionalNombre ? ` - ${profesionalNombre}` : ""}`
    : "—";
  const wb = XLSX.utils.book_new();
  const meta = [
    ["Documento", registro?.data?.documento ?? ""],
    ["Tipo", "Logros 2"],
    ["Consecutivo", registro?.tipo_consecutivo ?? ""],
    ["Fecha", registro?.created_at ?? ""],
    ["Sede", registro?.sede ?? ""],
    ["Profesional", profesional],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Resumen");

  const rows = [
    ["Slot", "Síntoma", "Nivel mejora", "Nuevo objetivo"],
    ...items.map((it) => [
      it.slot ?? "",
      it.sintoma_label ?? it.sintoma ?? "",
      it.nivel_mejora ?? "",
      it.nuevo_objetivo ?? it.objetivo_seguimiento ?? "",
    ]),
  ];
  const wsItems = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsItems, "Items");
  XLSX.writeFile(wb, `${baseFilenameRegistro(registro)}.xlsx`);
}

async function downloadLogros2Pdf(registro) {
  const items = itemsDesdeRegistro(registro);
  const doc = new jsPDF("p", "mm", "a4");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = 10;
  const logoDataUrl = await getWakeupLogoDataUrl();

  const drawHeader = () => {
    doc.setFillColor(234, 242, 255);
    doc.rect(margin, y, pageW - margin * 2, 28, "F");
    doc.setDrawColor(44, 107, 237);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 28, pageW - margin, y + 28);

    doc.setTextColor(29, 78, 216);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Informe de Seguimiento Logros 2", margin + 4, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(
      "Resumen de evolución y nuevos objetivos por síntoma.",
      margin + 4,
      y + 17,
    );

    if (logoDataUrl) {
      try {
        doc.addImage(
          logoDataUrl,
          "PNG",
          pageW - margin - 15,
          y + 2,
          11,
          11,
        );
      } catch {
        // ignore logo rendering errors
      }
    }

    y += 34;
  };

  const drawSectionTitle = (title) => {
    doc.setTextColor(31, 42, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin, y);
    y += 6;
  };

  const drawKV = (label, value) => {
    if (y > pageH - 22) {
      doc.addPage();
      y = 14;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 42, 68);
    doc.setFontSize(9.5);
    doc.text(`${label}:`, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const txt = String(value ?? "—");
    const lines = doc.splitTextToSize(txt, 130);
    doc.text(lines, margin + 30, y);
    y += Math.max(5, lines.length * 4.5);
  };

  const drawTableHeader = () => {
    const x = margin;
    const widths = [10, 50, 34, 48, 48];
    const h = 8;
    doc.setFillColor(234, 242, 255);
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), h, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), h);

    const labels = ["#", "Síntoma", "Evolución", "Objetivo previo", "Objetivo seguimiento"];
    let cx = x;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(53, 93, 134);
    doc.setFontSize(9);
    labels.forEach((label, i) => {
      doc.text(label, cx + 2, y + 5.4);
      cx += widths[i];
    });
    y += h;
    return widths;
  };

  const drawTableRow = (widths, row) => {
    const x = margin;
    const values = [
      String(row.slot ?? "—"),
      String(row.sintoma_label ?? row.sintoma ?? "—"),
      nivelMejoraLabel(row.nivel_mejora),
      String(row.objetivo_previo_label ?? "—"),
      nuevoObjetivoLabel(row),
    ];

    const wrapped = [
      doc.splitTextToSize(values[0], widths[0] - 4),
      doc.splitTextToSize(values[1], widths[1] - 4),
      doc.splitTextToSize(values[2], widths[2] - 4),
      doc.splitTextToSize(values[3], widths[3] - 4),
      doc.splitTextToSize(values[4], widths[4] - 4),
    ];
    const rowH = Math.max(7, ...wrapped.map((w) => w.length * 4.2 + 2));

    if (y + rowH > pageH - 16) {
      doc.addPage();
      y = 14;
      drawSectionTitle("Ítems de seguimiento");
      drawTableHeaderRef.widths = drawTableHeader();
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), rowH);
    let cx = x;
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    for (let i = 0; i < widths.length; i++) {
      if (i > 0) {
        doc.line(cx, y, cx, y + rowH);
      }
      doc.text(wrapped[i], cx + 2, y + 4.5);
      cx += widths[i];
    }
    y += rowH;
  };

  const drawTableHeaderRef = { widths: [] };
  const d = registro?.data || {};
  const profesionalCedula = String(d.encuestador ?? "").trim();
  const profesionalNombre = String(d.encuestador_nombre ?? "").trim();
  const profesional = profesionalCedula
    ? `${profesionalCedula}${profesionalNombre ? ` - ${profesionalNombre}` : ""}`
    : "—";

  const drawSummaryLine = (label, value) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = 14;
      drawSectionTitle("Resumen clínico");
    }
    const labelText = `${label}: `;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9.6);
    doc.text(labelText, margin, y);
    const labelW = doc.getTextWidth(labelText);
    doc.setFont("helvetica", "bold");
    doc.text(String(value || "—"), margin + labelW, y);
    y += 5.2;
  };

  drawHeader();
  drawSectionTitle("Datos principales");
  drawKV("Documento", registro?.data?.documento ?? "—");
  drawKV("Consecutivo", registro?.tipo_consecutivo ?? "—");
  drawKV("Fecha", fmtDate(registro?.created_at));
  drawKV("Sede", registro?.sede ?? "—");
  drawKV("Profesional", profesional);
  drawKV("Código", registro?.data?.codigo_seguimiento ?? "—");

  const patologia =
    d.patologia_relacionada_label ||
    d?.payload_origen?.patologia_fase1 ||
    "—";
  const narrativa = buildLogros2Narrativa(registro, items);

  drawSectionTitle("Resumen clínico");
  drawSummaryLine("Paciente", [d.nombres, d.apellidos].filter(Boolean).join(" ").trim() || "—");
  drawSummaryLine("Sede de realización", registro?.sede ?? "—");
  drawSummaryLine("Profesional", profesional);
  drawSummaryLine("Patología relacionada", patologia);
  drawSummaryLine("Ítems evaluados", `${items.length}`);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.3);
  const narrativaLines = doc.splitTextToSize(narrativa, pageW - margin * 2 - 2);
  doc.text(narrativaLines, margin, y);
  y += Math.max(8, narrativaLines.length * 4.5);

  y += 3;
  drawSectionTitle("Ítems de seguimiento");
  drawTableHeaderRef.widths = drawTableHeader();

  if (!items.length) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("Sin ítems registrados.", margin + 2, y + 6);
    y += 10;
  } else {
    for (const it of items) {
      drawTableRow(drawTableHeaderRef.widths, it);
    }
  }

  const fechaDescarga = new Date().toLocaleDateString("es-CO");
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.text(`Documento generado el ${fechaDescarga}.`, margin, pageH - 5.2);

  doc.save(`${baseFilenameRegistro(registro)}.pdf`);
}

function Logros2Viewer({ registro }) {
  const items = useMemo(() => itemsDesdeRegistro(registro), [registro]);
  const d = registro?.data || {};
  const paciente = [d.nombres, d.apellidos].filter(Boolean).join(" ").trim() || "—";
  const profesionalCedula = String(d.encuestador ?? "").trim();
  const profesionalNombre = String(d.encuestador_nombre ?? "").trim();
  const profesional = profesionalCedula
    ? `${profesionalCedula}${profesionalNombre ? ` - ${profesionalNombre}` : ""}`
    : "—";
  const patologia =
    d.patologia_relacionada_label ||
    d?.payload_origen?.patologia_fase1 ||
    "No reportada";
  const narrativa = buildLogros2Narrativa(registro, items);

  return (
    <div className="estad-res__logros2">
      <div className="estad-res__logros2-head">
        <div>
          <p className="estad-res__logros2-kicker">Resumen del seguimiento</p>
          <h4 className="estad-res__logros2-title">Encuesta Logros 2</h4>
        </div>
        <span className="estad-res__pill">{items.length} ítem{items.length === 1 ? "" : "s"}</span>
      </div>

      <div className="estad-res__logros2-meta">
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Paciente</span>
          <strong className="estad-res__meta-value">{paciente}</strong>
        </article>
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Documento</span>
          <strong className="estad-res__meta-value">{d.documento ?? "—"}</strong>
        </article>
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Fecha</span>
          <strong className="estad-res__meta-value">{fmtDate(registro?.created_at)}</strong>
        </article>
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Sede</span>
          <strong className="estad-res__meta-value">{registro?.sede ?? "—"}</strong>
        </article>
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Profesional</span>
          <strong className="estad-res__meta-value">{profesional}</strong>
        </article>
        <article className="estad-res__meta-card">
          <span className="estad-res__meta-label">Código</span>
          <strong className="estad-res__meta-value">{d.codigo_seguimiento ?? "—"}</strong>
        </article>
        <article className="estad-res__meta-card estad-res__meta-card--wide">
          <span className="estad-res__meta-label">Patología relacionada</span>
          <strong className="estad-res__meta-value">{patologia}</strong>
        </article>
      </div>
      <p className="estad-res__logros2-narrativa">{narrativa}</p>

      <div className="estad-res__table-wrap">
        <table className="estad-res__logros2-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Síntoma</th>
              <th>Nivel</th>
              <th>Nuevo objetivo</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4}>Sin ítems registrados.</td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={`${it.slot ?? idx}-${it.sintoma ?? idx}`}>
                  <td>{it.slot ?? idx + 1}</td>
                  <td>{it.sintoma_label ?? it.sintoma ?? "—"}</td>
                  <td>
                    <span className="estad-res__level-chip">{it.nivel_mejora ?? "—"}</span>
                  </td>
                  <td>{it.nuevo_objetivo ?? it.objetivo_seguimiento ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Resultados: búsqueda por documento y descarga de la encuesta de un paciente.
 */
export default function EstadisticasResultados() {
  const [filtroTipo, setFiltroTipo] = useState("cedula");
  const [cedulaBusqueda, setCedulaBusqueda] = useState("");
  const [formato, setFormato] = useState("pdf");
  const [buscando, setBuscando] = useState(false);
  const [registrosEncontrados, setRegistrosEncontrados] = useState([]);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const handleBuscar = async () => {
    if (filtroTipo !== "cedula") {
      await alertInfo({
        title: "Próximamente",
        text: "Por ahora solo está disponible el filtro por documento de identificación.",
      });
      return;
    }

    const documento = String(cedulaBusqueda).trim();

    if (!documento) {
      await alertWarning({
        title: "Campo requerido",
        text: "Debes ingresar un documento para realizar la búsqueda.",
      });
      return;
    }

    if (!/^\d+$/.test(documento)) {
      await alertWarning({
        title: "Documento inválido",
        text: "El documento debe contener solo números.",
      });
      return;
    }

    setBuscando(true);
    setRegistrosEncontrados([]);
    setRegistroSeleccionado(null);

    try {
      const res = await fetch(
        apiUrl(`/verificacion/registros/${encodeURIComponent(documento)}`),
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          await alertInfo({
            title: "Sin resultados",
            text: "No se encontraron registros para ese documento.",
          });
          return;
        }

        await alertError({
          title: "Error",
          text: json?.detail || "No se pudo consultar los registros del paciente.",
        });
        return;
      }

      const registros = Array.isArray(json?.registros) ? json.registros : [];
      if (registros.length === 0) {
        await alertInfo({
          title: "Sin resultados",
          text: "No se encontró información para ese documento.",
        });
        return;
      }

      registros.sort((a, b) =>
        String(a?.created_at ?? "").localeCompare(String(b?.created_at ?? "")),
      );

      setRegistrosEncontrados(registros);
      setRegistroSeleccionado(registros[0]);
    } catch (error) {
      console.error(error);
      await alertError({
        title: "Error de conexión",
        text: "No fue posible conectar con el servidor.",
      });
    } finally {
      setBuscando(false);
    }
  };

  const handleDescargar = async () => {
    if (!registroSeleccionado) {
      await alertWarning({
        title: "Sin datos",
        text: "Primero selecciona un registro para descargar.",
      });
      return;
    }

    try {
      if (registroSeleccionado.tipo === "logros1") {
        const ctx = buildLogrosFase1DownloadContext(registroSeleccionado.data);
        if (!ctx) return;
        if (formato === "pdf") {
          await downloadLogrosFase1Pdf(ctx);
        } else if (formato === "csv") {
          downloadLogrosFase1Csv(ctx);
        } else {
          downloadLogrosFase1Xlsx(ctx);
        }
      } else {
        if (formato === "pdf") {
          await downloadLogros2Pdf(registroSeleccionado);
        } else if (formato === "csv") {
          downloadLogros2Csv(registroSeleccionado);
        } else {
          downloadLogros2Xlsx(registroSeleccionado);
        }
      }

      const etiquetaFormato =
        formato === "pdf" ? "PDF" : formato === "csv" ? "CSV" : "Excel";
      await toastSuccess({
        title: "Descarga completada",
        text: `Encuesta exportada en ${etiquetaFormato}. Revisa la carpeta de descargas.`,
      });
    } catch (e) {
      console.error(e);
      await toastError({
        title: "Error al descargar",
        text: "No se pudo generar el archivo de la encuesta.",
      });
    }
  };

  return (
    <section className="estad-page estad-res" aria-labelledby="estad-res-title">
      <PageHeader>
        <PageTitle id="estad-res-title">Resultados</PageTitle>
        <PageLead>
          Busca por documento y descarga la encuesta del paciente en PDF, CSV o
          Excel.
        </PageLead>
        <PageMeta tone="neutral">
          Consulta individual: un documento por búsqueda.
        </PageMeta>
      </PageHeader>

      <div className="estad-page__card">
      <div className="estad-filtros__panel">
        <div className="estad-filtros__field estad-filtros__field--2">
          <FormLabel htmlFor="res-filtro-tipo" className="estad-filtros__lbl">
            Filtra por
          </FormLabel>
          <select
            id="res-filtro-tipo"
            className="estad-filtros__select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="cedula">Documento de identificación</option>
            <option value="genero" disabled>
              Género (próximamente)
            </option>
          </select>
        </div>

        <div className="estad-filtros__field estad-filtros__field--3">
          <FormLabel htmlFor="res-cedula-input" className="estad-filtros__lbl">
            Documento
          </FormLabel>
          <input
            id="res-cedula-input"
            type="text"
            className="estad-filtros__input"
            placeholder="Documento del paciente"
            value={cedulaBusqueda}
            onChange={(e) => setCedulaBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            disabled={filtroTipo !== "cedula"}
          />
          <Button
            variant="teal"
            size="sm"
            type="button"
            onClick={handleBuscar}
            disabled={buscando || filtroTipo !== "cedula"}
          >
            {buscando ? "Buscando…" : "Buscar"}
          </Button>
        </div>

        <div className="estad-filtros__divider" />

        <div className="estad-filtros__field estad-filtros__field--3 estad-filtros__field--export">
          <FormLabel htmlFor="res-formato-select" className="estad-filtros__lbl">
            Tipo de formato
          </FormLabel>
          <select
            id="res-formato-select"
            className="estad-filtros__select"
            value={formato}
            onChange={(e) => setFormato(e.target.value)}
          >
            {FORMATOS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            type="button"
            onClick={handleDescargar}
            disabled={!registroSeleccionado}
            title="Descargar encuesta"
            className="estad-filtros__btnIcon"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 3v12m0 0l4-4m-4 4l-4-4M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Descargar
          </Button>
        </div>
      </div>

      {registrosEncontrados.length > 0 ? (
        <div className="estad-filtros__viewer">
          <div className="estad-res__resumen">
            <SectionTitle className="estad-filtros__viewer-title">
              Registros encontrados ({registrosEncontrados.length})
            </SectionTitle>
            <div className="estad-res__resumen-linea">
              {registrosEncontrados.map((r) => (
                <span key={r.id} className="estad-res__badge">
                  {r.etiqueta}
                </span>
              ))}
            </div>
          </div>

          <div className="estad-res__lista">
            {registrosEncontrados.map((r) => (
              <div
                key={r.id}
                className={`estad-res__item ${
                  registroSeleccionado?.id === r.id ? "is-active" : ""
                }`}
              >
                <div className="estad-res__item-main">
                  <p className="estad-res__item-title">{r.etiqueta}</p>
                  <p className="estad-res__item-meta">
                    {fmtDate(r.created_at)} · {r.sede || "Sin sede"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={registroSeleccionado?.id === r.id ? "teal" : "tealSoft"}
                  className="estad-res__item-btn"
                  onClick={() => setRegistroSeleccionado(r)}
                >
                  Visualizar
                </Button>
              </div>
            ))}
          </div>

          <SectionTitle className="estad-filtros__viewer-title">
            Vista previa del registro seleccionado
          </SectionTitle>
          {registroSeleccionado?.tipo === "logros1" ? (
            <LogrosFase1Viewer paciente={registroSeleccionado.data} />
          ) : (
            <Logros2Viewer registro={registroSeleccionado} />
          )}
        </div>
      ) : (
        <Muted className="estad-filtros__empty">
          Ingresa un documento y pulsa Buscar para listar todos los registros del
          paciente (Logros 1 y Logros 2), visualizar cada uno y decidir cuál
          descargar.
        </Muted>
      )}
      </div>
    </section>
  );
}
