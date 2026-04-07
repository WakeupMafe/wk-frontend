import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../../../components/ButtonComponente";
import {
  ErrorText,
  FormLabel,
  PageHeader,
  PageMeta,
  PageTitle,
} from "../../../components/typography";
import { PROBLEMAS, TIPOS_DOCUMENTO } from "../../../data/encuestaLogrosCatalog";
import {
  alertWarning,
  toastError,
  toastSuccess,
} from "../../../lib/alerts/appAlert";
import {
  downloadCompendioCsv,
  downloadCompendioPdf,
  downloadCompendioXlsx,
} from "./compendioDownload";
import "./EstadisticasFiltrosAggregate.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SEDES = [
  { value: "", label: "Todas las sedes" },
  { value: "Poblado", label: "Poblado" },
  { value: "Laureles", label: "Laureles" },
  { value: "Barranquilla", label: "Barranquilla" },
];

const SINTOMAS_OPCIONES = PROBLEMAS.filter((p) => p.value !== "otro");

const TIPO_DOC_FILTRO = [
  { value: "", label: "Cualquiera" },
  ...TIPOS_DOCUMENTO,
];

const MAX_SINTOMAS = 3;

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function sintomasCelda(row) {
  return [row.sintoma_1, row.sintoma_2, row.sintoma_3]
    .filter(Boolean)
    .join(", ");
}

function etiquetaSintoma(value) {
  return SINTOMAS_OPCIONES.find((p) => p.value === value)?.label ?? value;
}

/**
 * Filtros: sede (fila propia), barra tipo Supabase (nombres, apellidos, tipo doc),
 * síntomas por menú + chips (máx. 3), tabla y compendio.
 */
export default function EstadisticasFiltros() {
  const [sede, setSede] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [seleccionSintomas, setSeleccionSintomas] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [formato, setFormato] = useState("pdf");

  const [menuSintomaAbierto, setMenuSintomaAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuSintomaAbierto) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuSintomaAbierto(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuSintomaAbierto]);

  const agregarSintoma = (value) => {
    setSeleccionSintomas((prev) => {
      if (prev.includes(value)) return prev;
      if (prev.length >= MAX_SINTOMAS) return prev;
      return [...prev, value];
    });
    setMenuSintomaAbierto(false);
  };

  const quitarSintoma = (value) => {
    setSeleccionSintomas((prev) => prev.filter((v) => v !== value));
  };

  const consultar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setRows([]);
    setMeta(null);

    try {
      const params = new URLSearchParams();
      if (sede) params.set("sede", sede);
      if (nombres.trim()) params.set("nombres", nombres.trim());
      if (apellidos.trim()) params.set("apellidos", apellidos.trim());
      if (tipoDocumento) params.set("tipo_documento", tipoDocumento);
      if (seleccionSintomas.length) {
        params.set("sintomas", seleccionSintomas.join(","));
      }

      const res = await fetch(
        `${API_URL}/encuestas/listado-filtrado?${params.toString()}`,
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const d = json?.detail;
        const msg =
          typeof d === "string"
            ? d
            : d && typeof d === "object"
              ? JSON.stringify(d)
              : "No se pudo obtener el listado";
        throw new Error(msg);
      }

      setRows(json?.rows ?? []);
      setMeta({
        total_en_base: json?.total_en_base,
        filtros: json?.filtros,
        actualizado_en: json?.actualizado_en,
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [sede, nombres, apellidos, tipoDocumento, seleccionSintomas]);

  const limpiarFiltros = useCallback(() => {
    setSede("");
    setNombres("");
    setApellidos("");
    setTipoDocumento("");
    setSeleccionSintomas([]);
    setMenuSintomaAbierto(false);
    setRows([]);
    setMeta(null);
    setErr(null);
  }, []);

  const handleDescargarCompendio = async () => {
    if (!rows.length) {
      await alertWarning({
        title: "Sin datos",
        text: "Consulta primero para obtener filas en la tabla.",
      });
      return;
    }

    const base = `compendio_encuestas_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (formato === "pdf") {
        downloadCompendioPdf(rows, meta, base);
      } else if (formato === "csv") {
        downloadCompendioCsv(rows, base);
      } else {
        downloadCompendioXlsx(rows, base);
      }
      const etiquetaFormato =
        formato === "pdf" ? "PDF" : formato === "csv" ? "CSV" : "Excel";
      await toastSuccess({
        title: "Descarga completada",
        text: `Compendio en ${etiquetaFormato} generado correctamente.`,
      });
    } catch (e) {
      console.error(e);
      await toastError({
        title: "Error al descargar",
        text: "No se pudo generar el archivo del compendio.",
      });
    }
  };

  const totalBase = meta?.total_en_base ?? "—";
  const mostrados = rows.length;
  const sintomasDisponibles = SINTOMAS_OPCIONES.filter(
    (p) => !seleccionSintomas.includes(p.value),
  );

  return (
    <section className="estad-page estad-filtros" aria-labelledby="estad-agg-title">
      <PageHeader>
        <PageTitle id="estad-agg-title">Filtros</PageTitle>
        <PageMeta tone="neutral">
          Última actualización:{" "}
          <time dateTime={meta?.actualizado_en}>
            {loading ? "…" : fmtDate(meta?.actualizado_en)}
          </time>
        </PageMeta>
      </PageHeader>

      <div className="estad-page__card estad-filtros__card">
        <div className="estad-agg__form">
          <div className="estad-filtros-stack">
            {/* Sede: misma fila etiqueta + select que antes */}
            <div className="estad-agg__field estad-agg__field--sede">
              <FormLabel htmlFor="agg-sede" className="estad-agg__lbl">
                Sede
              </FormLabel>
              <select
                id="agg-sede"
                className="estad-agg__select"
                value={sede}
                onChange={(e) => setSede(e.target.value)}
              >
                {SEDES.map((s) => (
                  <option key={s.value || "all"} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Barra tipo Supabase: nombres, apellidos, tipo_documento */}
            <div className="estad-sb-bar" aria-label="Filtros por campo">
              <span className="estad-sb-bar__search" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="estad-sb-bar__row">
                <div className="estad-sb-pill">
                  <span className="estad-sb-pill__key typo-field-key">Nombres</span>
                  <span className="estad-sb-pill__eq">·</span>
                  <input
                    type="text"
                    className="estad-sb-pill__input"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    placeholder="Texto a buscar"
                    autoComplete="off"
                    aria-label="Nombres (contiene)"
                  />
                </div>
                <div className="estad-sb-pill">
                  <span className="estad-sb-pill__key typo-field-key">Apellidos</span>
                  <span className="estad-sb-pill__eq">·</span>
                  <input
                    type="text"
                    className="estad-sb-pill__input"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Texto a buscar"
                    autoComplete="off"
                    aria-label="Apellidos (contiene)"
                  />
                </div>
                <div className="estad-sb-pill estad-sb-pill--select">
                  <span className="estad-sb-pill__key typo-field-key">
                    Tipo documento
                  </span>
                  <span className="estad-sb-pill__eq">·</span>
                  <select
                    className="estad-sb-pill__select"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    aria-label="Tipo de documento"
                  >
                    {TIPO_DOC_FILTRO.map((t) => (
                      <option key={t.value || "any"} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Síntomas: misma alineación que Sede (etiqueta | contenido) */}
            <div className="estad-agg__field estad-agg__field--sym">
              <span
                className="typo-form-label estad-agg__lbl estad-sb-sym__label"
                id="agg-sintomas-label"
              >
                <span className="estad-sb-sym__label-main">Síntomas</span>
                <span className="estad-sb-sym__label-meta">
                  {" "}
                  (máximo {MAX_SINTOMAS})
                </span>
              </span>
              <div className="estad-sb-sym" ref={menuRef} aria-labelledby="agg-sintomas-label">
              <div className="estad-sb-sym__row">
                <Button
                  variant="tealSoft"
                  size="sm"
                  type="button"
                  className="estad-sb-sym__trigger"
                  onClick={() => setMenuSintomaAbierto((o) => !o)}
                  disabled={seleccionSintomas.length >= MAX_SINTOMAS}
                  aria-expanded={menuSintomaAbierto}
                  aria-haspopup="listbox"
                >
                  Añadir síntoma
                  <span className="estad-sb-sym__chev" aria-hidden>
                    ▾
                  </span>
                </Button>
                <div className="estad-sb-sym__chips" role="list">
                  {seleccionSintomas.map((v) => (
                    <span key={v} className="estad-sb-tag" role="listitem">
                      <span className="estad-sb-tag__key typo-field-key">Síntoma</span>
                      <span className="estad-sb-tag__eq">=</span>
                      <span className="estad-sb-tag__val" title={etiquetaSintoma(v)}>
                        {etiquetaSintoma(v)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="estad-sb-tag__x"
                        onClick={() => quitarSintoma(v)}
                        aria-label={`Quitar ${etiquetaSintoma(v)}`}
                      >
                        ×
                      </Button>
                    </span>
                  ))}
                </div>
              </div>
              {menuSintomaAbierto ? (
                <ul className="estad-sb-menu" role="listbox">
                  {sintomasDisponibles.length === 0 ? (
                    <li className="estad-sb-menu__empty">No hay más síntomas</li>
                  ) : (
                    sintomasDisponibles.map((p) => (
                      <li key={p.value} role="none">
                        <Button
                          variant="bare"
                          type="button"
                          className="estad-sb-menu__item"
                          role="option"
                          onClick={() => agregarSintoma(p.value)}
                        >
                          {p.label}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
              </div>
            </div>

            <div className="estad-agg__actions">
              <Button
                variant="outline"
                type="button"
                className="estad-agg__btn-limpiar"
                onClick={limpiarFiltros}
                disabled={loading}
                aria-label="Limpiar todos los filtros y la tabla de resultados"
              >
                Limpiar Filtros
              </Button>
              <Button
                variant="teal"
                type="button"
                onClick={consultar}
                disabled={loading}
              >
                {loading ? "Consultando…" : "Consultar"}
              </Button>
            </div>
          </div>

            <div className="estad-filtros__footer">
              <div className="estad-agg__stats" aria-live="polite">
                <span className="estad-agg__stat-num">
                  {loading ? "…" : `${mostrados}/${totalBase}`}
                </span>
                <span className="estad-agg__stat-label">
                  coincidencias / total en base
                </span>
              </div>

              <div className="estad-agg__export">
                <FormLabel htmlFor="agg-formato" className="estad-agg__lbl">
                  Exportar
                </FormLabel>
                <select
                  id="agg-formato"
                  className="estad-agg__select estad-agg__select--sm"
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleDescargarCompendio}
                  disabled={!rows.length}
                >
                  Descargar
                </Button>
              </div>
            </div>
        </div>

        {err ? (
          <ErrorText className="estad-agg__error" role="alert">
            {err}
          </ErrorText>
        ) : null}

        <div className="estad-agg__tablewrap">
          <table className="estad-agg__table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Sede</th>
                <th>Síntomas</th>
                <th>Obj.</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="estad-agg__emptycell">
                    Sin resultados. Pulse Consultar tras definir los criterios.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id_int ?? `${r.documento}-${r.created_at}`}>
                  <td>{r.documento ?? "—"}</td>
                  <td>{r.nombres ?? "—"}</td>
                  <td>{r.apellidos ?? "—"}</td>
                  <td>{r.sede ?? "—"}</td>
                  <td className="estad-agg__td-sintomas">{sintomasCelda(r)}</td>
                  <td>{r.objetivos_seleccionados ?? "—"}</td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
