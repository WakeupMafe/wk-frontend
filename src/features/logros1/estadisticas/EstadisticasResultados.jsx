import { useState } from "react";
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

/**
 * Resultados: búsqueda por cédula y descarga de la encuesta de un paciente.
 */
export default function EstadisticasResultados() {
  const [filtroTipo, setFiltroTipo] = useState("cedula");
  const [cedulaBusqueda, setCedulaBusqueda] = useState("");
  const [formato, setFormato] = useState("pdf");
  const [buscando, setBuscando] = useState(false);
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null);

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
    setPacienteEncontrado(null);

    try {
      const res = await fetch(
        apiUrl(`/verificacion/logros-fase1/${encodeURIComponent(documento)}`),
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404) {
          await alertInfo({
            title: "Sin resultados",
            text: "No se encontró encuesta para esa cédula.",
          });
          return;
        }

        await alertError({
          title: "Error",
          text: json?.detail || "No se pudo consultar la encuesta.",
        });
        return;
      }

      const row = json?.data;

      if (!row) {
        await alertInfo({
          title: "Sin resultados",
          text: "No se encontró información para esa cédula.",
        });
        return;
      }

      setPacienteEncontrado(row);
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
    if (!pacienteEncontrado) {
      await alertWarning({
        title: "Sin datos",
        text: "Primero busca una cédula con encuesta registrada.",
      });
      return;
    }

    const ctx = buildLogrosFase1DownloadContext(pacienteEncontrado);
    if (!ctx) return;

    try {
      if (formato === "pdf") {
        await downloadLogrosFase1Pdf(ctx);
      } else if (formato === "csv") {
        downloadLogrosFase1Csv(ctx);
      } else {
        downloadLogrosFase1Xlsx(ctx);
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
            disabled={!pacienteEncontrado}
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

      {pacienteEncontrado ? (
        <div className="estad-filtros__viewer">
          <SectionTitle className="estad-filtros__viewer-title">
            Vista previa
          </SectionTitle>
          <LogrosFase1Viewer paciente={pacienteEncontrado} />
        </div>
      ) : (
        <Muted className="estad-filtros__empty">
          Ingresa una cédula y pulsa Buscar para visualizar y descargar la
          encuesta.
        </Muted>
      )}
      </div>
    </section>
  );
}
