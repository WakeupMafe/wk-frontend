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

function downloadLogros2Csv(registro) {
  const items = itemsDesdeRegistro(registro);
  const lines = [
    ["Documento", "Tipo", "Consecutivo", "Fecha", "Sede"].join(","),
    [
      registro?.data?.documento ?? "",
      "Logros 2",
      registro?.tipo_consecutivo ?? "",
      registro?.created_at ?? "",
      registro?.sede ?? "",
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
  const wb = XLSX.utils.book_new();
  const meta = [
    ["Documento", registro?.data?.documento ?? ""],
    ["Tipo", "Logros 2"],
    ["Consecutivo", registro?.tipo_consecutivo ?? ""],
    ["Fecha", registro?.created_at ?? ""],
    ["Sede", registro?.sede ?? ""],
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

function downloadLogros2Pdf(registro) {
  const items = itemsDesdeRegistro(registro);
  const doc = new jsPDF("p", "mm", "a4");
  let y = 12;
  doc.setFontSize(14);
  doc.text("Registro Logros 2", 10, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Documento: ${registro?.data?.documento ?? "—"}`, 10, y);
  y += 6;
  doc.text(`Consecutivo: ${registro?.tipo_consecutivo ?? "—"}`, 10, y);
  y += 6;
  doc.text(`Fecha: ${fmtDate(registro?.created_at)}`, 10, y);
  y += 6;
  doc.text(`Sede: ${registro?.sede ?? "—"}`, 10, y);
  y += 8;

  doc.setFontSize(9);
  doc.text("Ítems de seguimiento:", 10, y);
  y += 6;

  for (const it of items) {
    if (y > 270) {
      doc.addPage();
      y = 12;
    }
    const line = `• [${it.slot ?? "-"}] ${it.sintoma_label ?? it.sintoma ?? "—"} | Nivel: ${
      it.nivel_mejora ?? "—"
    } | Objetivo: ${it.nuevo_objetivo ?? it.objetivo_seguimiento ?? "—"}`;
    const split = doc.splitTextToSize(line, 190);
    doc.text(split, 10, y);
    y += 5 * split.length;
  }
  doc.save(`${baseFilenameRegistro(registro)}.pdf`);
}

function Logros2Viewer({ registro }) {
  const items = useMemo(() => itemsDesdeRegistro(registro), [registro]);
  const d = registro?.data || {};
  return (
    <div className="estad-res__logros2">
      <div className="estad-res__logros2-meta">
        <span><b>Documento:</b> {d.documento ?? "—"}</span>
        <span><b>Fecha:</b> {fmtDate(registro?.created_at)}</span>
        <span><b>Sede:</b> {registro?.sede ?? "—"}</span>
        <span><b>Código:</b> {d.codigo_seguimiento ?? "—"}</span>
      </div>
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
                <td>{it.nivel_mejora ?? "—"}</td>
                <td>{it.nuevo_objetivo ?? it.objetivo_seguimiento ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Resultados: búsqueda por cédula y descarga de la encuesta de un paciente.
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
        text: "Por ahora solo está disponible el filtro por cédula.",
      });
      return;
    }

    const documento = String(cedulaBusqueda).trim();

    if (!documento) {
      await alertWarning({
        title: "Campo requerido",
        text: "Debes ingresar una cédula para realizar la búsqueda.",
      });
      return;
    }

    if (!/^\d+$/.test(documento)) {
      await alertWarning({
        title: "Cédula inválida",
        text: "La cédula debe contener solo números.",
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
            text: "No se encontraron registros para esa cédula.",
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
          text: "No se encontró información para esa cédula.",
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
          downloadLogros2Pdf(registroSeleccionado);
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
          Busca por cédula y descarga la encuesta del paciente en PDF, CSV o
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
            <option value="cedula">Cédula</option>
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
            placeholder="Cédula del paciente"
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
          Ingresa una cédula y pulsa Buscar para listar todos los registros del
          paciente (Logros 1 y Logros 2), visualizar cada uno y decidir cuál
          descargar.
        </Muted>
      )}
      </div>
    </section>
  );
}
