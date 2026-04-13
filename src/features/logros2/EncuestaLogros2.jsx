import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import SelectInput from "../../components/SelectInput";
import AutorizadosHeader from "../../components/AutorizadosHeader";
import Button from "../../components/ButtonComponente";
import NavBackButton from "../../components/NavBackButton";
import WelcomeLayout from "../../layouts/WelcomeLayout";
import "../../components/SweetAlert.css";
import "../../components/TextInput.css";
import "../../components/EncuestasDisponibles.css";
import "./EncuestaLogros2.css";

import fondo2 from "../../assets/fondo2.svg";

import {
  alertConfirm,
  alertError,
  alertSuccess,
  alertWarning,
} from "../../lib/alerts/appAlert";
import { sweetLoading, sweetClose } from "../../components/SweetAlert";

import { NIVEL_MEJORA, getOpcionesNuevoObjetivo } from "./logros2Catalog";
import {
  formatFechaEvaluacion,
  labelLimitacionNarrativa,
  labelsActividades,
  mapSymptomLabel,
  buildSlotsFromFase1,
  normalizeFase1Row,
  labelsQueImpide,
  mapLastTimeLabel,
} from "./logros2Formatters";

import { PATOLOGIA_RELACIONADA } from "../../data/encuestaLogrosCatalog";
import { apiUrl } from "../../lib/api/baseUrl";
import {
  WK_PERFIL_ACTUALIZADO,
  emitPerfilActualizado,
  readAutorizadoCache,
} from "../../lib/autorizadoPerfilEvents";

const PATOLOGIA_RELACIONADA_LABEL = Object.fromEntries(
  PATOLOGIA_RELACIONADA.map((o) => [o.value, o.label]),
);

function TextField({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
  error,
  maxLength,
}) {
  return (
    <div className="field">
      {label ? (
        <label className="field__label" htmlFor={name}>
          {label} {required ? <span className="field__req">*</span> : null}
        </label>
      ) : null}
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`field__input ${error ? "field__input--error" : ""}`}
      />
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

export default function EncuestaLogros2() {
  const location = useLocation();
  const { sede: sedeParam } = useParams();

  const sedeFormulario =
    location.state?.sedeCarpeta ||
    location.state?.sede ||
    (() => {
      try {
        const cached = sessionStorage.getItem("wk_contexto_directorio");
        const c = cached ? JSON.parse(cached) : null;
        return c?.sede || "Sin sede";
      } catch {
        return "Sin sede";
      }
    })();

  const pinSesion =
    location.state?.pin ?? sessionStorage.getItem("wk_pin") ?? undefined;

  const [headerUsuario, setHeaderUsuario] = useState(
    () =>
      location.state?.usuario ||
      readAutorizadoCache().usuario ||
      "Usuario",
  );
  const [headerSede, setHeaderSede] = useState(
    () => location.state?.sede || sedeFormulario,
  );
  const [headerCorreo, setHeaderCorreo] = useState(() =>
    String(readAutorizadoCache().correo || "").trim(),
  );
  const [encuestasCount, setEncuestasCount] = useState(
    () =>
      location.state?.encuestasRealizadas ??
      readAutorizadoCache().encuestasRealizadas ??
      0,
  );

  useEffect(() => {
    const onPerfil = () => {
      const c = readAutorizadoCache();
      if (c.usuario) setHeaderUsuario(c.usuario);
      if (c.sede) setHeaderSede(c.sede);
      if (c.correo != null) setHeaderCorreo(String(c.correo).trim());
      if (typeof c.encuestasRealizadas === "number") {
        setEncuestasCount(c.encuestasRealizadas);
      }
    };
    window.addEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
    return () => window.removeEventListener(WK_PERFIL_ACTUALIZADO, onPerfil);
  }, []);

  const encuestadorCache =
    location.state?.cedula ||
    (() => {
      try {
        const cached = sessionStorage.getItem("wk_autorizado");
        const c = cached ? JSON.parse(cached) : null;
        return c?.cedula || "";
      } catch {
        return "";
      }
    })();

  const encuestasListPath = `/sede/${encodeURIComponent(
    sedeParam || sedeFormulario,
  )}/encuestas`;

  const encuestasListState = {
    usuario: headerUsuario,
    sede: headerSede,
    encuestasRealizadas: encuestasCount,
    cedula: encuestadorCache || location.state?.cedula,
    pin: pinSesion,
  };

  const [docBusqueda, setDocBusqueda] = useState("");
  /** Texto libre en el campo de búsqueda (nombre, apellido o cédula). */
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const busquedaWrapRef = useRef(null);
  const skipBusquedaRef = useRef(false);

  const [fase1, setFase1] = useState(null);
  /** Referencia estable a Fase 1: documento + created_at (no depende de id_int). */
  const [fase1Referencia, setFase1Referencia] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState({});

  /** @type {Record<string, { nivel: string; nuevo: string }>} */
  const [respuestas, setRespuestas] = useState({});

  const slots = useMemo(
    () => (fase1 ? buildSlotsFromFase1(fase1) : []),
    [fase1],
  );

  /** Alineado con API buscar-logros1: ≥4 letras o ≥5 dígitos (sin barrer tablas enteras). */
  const busquedaCumpleMinimo = useMemo(() => {
    const q = busquedaTexto.trim();
    const digitos = q.replace(/\D/g, "").length;
    const letras = q.replace(/[^\p{L}]/gu, "").length;
    return letras >= 4 || digitos >= 5;
  }, [busquedaTexto]);

  const fechaEval = fase1 ? formatFechaEvaluacion(fase1.created_at) : "";
  const limLabel = fase1
    ? labelLimitacionNarrativa(fase1.limitacion_moverse)
    : "";
  const actLabel = fase1 ? labelsActividades(fase1.actividades_afectadas) : "";

  const documentoDesdeCampos = () => {
    const d = docBusqueda.replace(/\D/g, "").trim();
    if (d.length >= 6) return d;
    return busquedaTexto.replace(/\D/g, "").trim();
  };

  const etiquetaFilaPaciente = (r) => {
    const nom = `${r.nombres || ""} ${r.apellidos || ""}`.trim() || "Sin nombre";
    const doc = String(r.documento ?? "");
    const sedeR = String(r.sede ?? "").trim();
    return `${nom} · Doc. ${doc}${sedeR ? ` · ${sedeR}` : ""}`;
  };

  const cargarFase1PorDocumento = async (docRaw, createdAtOpcional) => {
    const doc = String(docRaw || "")
      .replace(/\D/g, "")
      .trim();
    if (doc.length < 6) {
      await alertWarning({
        title: "Identificación",
        text: "Se requiere un documento numérico válido (mínimo 6 dígitos). Seleccione una opción de la lista o escriba la cédula completa.",
      });
      return false;
    }

    setCargando(true);
    setErrors({});
    try {
      let path = apiUrl(`/verificacion/logros-fase1/${encodeURIComponent(doc)}`);
      if (createdAtOpcional != null && String(createdAtOpcional).trim() !== "") {
        const q = new URLSearchParams({
          created_at: String(createdAtOpcional).trim(),
        });
        path += `${path.includes("?") ? "&" : "?"}${q.toString()}`;
      }
      const res = await fetch(path);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFase1(null);
        setFase1Referencia(null);
        await alertWarning({
          title: "Sin evaluación previa",
          text:
            json?.detail ||
            "No existe registro de la evaluación por logros (Fase 1) para este documento. Debe completarse primero dicha evaluación.",
        });
        return false;
      }

      const row = json?.data;
      if (!row) {
        setFase1(null);
        setFase1Referencia(null);
        return false;
      }

      setDocBusqueda(doc);
      const normalized = normalizeFase1Row(row);
      setFase1(normalized);
      setFase1Referencia({
        documento: row.documento,
        created_at: row.created_at,
        nombres: row.nombres ?? null,
        apellidos: row.apellidos ?? null,
        tipo_documento: row.tipo_documento || "cedula",
        sede: row.sede ?? null,
      });
      const built = buildSlotsFromFase1(normalized);
      const init = {};
      for (const s of built) {
        init[String(s.slot)] = { nivel: "", nuevo: "" };
      }
      setRespuestas(init);
      setMostrarSugerencias(false);
      return true;
    } catch {
      setFase1(null);
      setFase1Referencia(null);
      await alertError({
        title: "Error",
        text: "No fue posible recuperar la evaluación previa. Intente nuevamente.",
      });
      return false;
    } finally {
      setCargando(false);
    }
  };

  const buscarEncuestaBase = async () => {
    const doc = documentoDesdeCampos();
    await cargarFase1PorDocumento(doc);
  };

  const seleccionarPaciente = (r) => {
    const doc = String(r.documento ?? "").replace(/\D/g, "").trim();
    skipBusquedaRef.current = true;
    setBusquedaTexto(etiquetaFilaPaciente(r));
    setDocBusqueda(doc);
    setMostrarSugerencias(false);
    setSugerencias([]);
    void cargarFase1PorDocumento(doc, r.created_at);
  };

  useEffect(() => {
    if (skipBusquedaRef.current) {
      skipBusquedaRef.current = false;
      setSugerencias([]);
      setBuscandoSugerencias(false);
      return;
    }
    const q = busquedaTexto.trim();
    const letras = q.replace(/[^\p{L}]/gu, "").length;
    const digitos = q.replace(/\D/g, "").length;
    console.log("[L2 BUSQUEDA] texto(raw)=", JSON.stringify(busquedaTexto));
    console.log("[L2 BUSQUEDA] texto(trim)=", JSON.stringify(q));
    console.log("[L2 BUSQUEDA] letras=", letras);
    console.log("[L2 BUSQUEDA] digitos=", digitos);
    console.log("[L2 BUSQUEDA] cumpleMinimo=", busquedaCumpleMinimo);
    if (!busquedaCumpleMinimo) {
      setSugerencias([]);
      setBuscandoSugerencias(false);
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setBuscandoSugerencias(true);
      try {
        const params = new URLSearchParams({
          q,
          limit: "25",
        });
        const url = apiUrl(`/encuestas/buscar-logros1?${params.toString()}`);
        console.log(
          "[L2 BUSQUEDA] t=",
          new Date().toISOString(),
          "llamando endpoint…",
        );
        console.log("[L2 BUSQUEDA] url=", url);
        const res = await fetch(url, { signal: ctrl.signal });
        const text = await res.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
          json = {};
        }
        console.log("[L2 BUSQUEDA] resp status=", res.status, "body(raw)=", text);
        console.log("[L2 BUSQUEDA] json.ok=", json?.ok, "resultados.len=", Array.isArray(json?.resultados) ? json.resultados.length : "n/a");
        console.log("[L2 BUSQUEDA] _debug=", json?._debug);
        if (!res.ok) {
          setSugerencias([]);
          return;
        }
        setSugerencias(Array.isArray(json?.resultados) ? json.resultados : []);
      } catch (e) {
        console.log("[L2 BUSQUEDA] fetch error=", e?.name, e?.message);
        if (e?.name !== "AbortError") setSugerencias([]);
      } finally {
        setBuscandoSugerencias(false);
      }
    }, 320);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [busquedaTexto, busquedaCumpleMinimo]);

  useEffect(() => {
    const onDown = (e) => {
      if (!busquedaWrapRef.current?.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const setNivel = (slotDef, value) => {
    if (!slotDef) return;
    const slot = String(slotDef.slot);
    setRespuestas((prev) => {
      const cur = prev[slot] || { nivel: "", nuevo: "" };
      const next = { ...cur, nivel: value };
      if (value === "nada") {
        if (slotDef.inputMode === "select" && slotDef.objetivoPrevioKey) {
          next.nuevo = slotDef.objetivoPrevioKey;
        } else if (slotDef.inputMode === "text") {
          const t = String(slotDef.objetivoPrevioLabel || "").trim();
          if (t && t !== "—") next.nuevo = t;
        } else if (slotDef.objetivoPrevioKey) {
          next.nuevo = slotDef.objetivoPrevioKey;
        }
      }
      return { ...prev, [slot]: next };
    });
  };

  const setNuevo = (slot, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [String(slot)]: {
        ...(prev[String(slot)] || { nivel: "", nuevo: "" }),
        nuevo: value,
      },
    }));
  };

  const validate = () => {
    const next = {};
    for (const s of slots) {
      const r = respuestas[String(s.slot)];
      if (!r?.nivel) {
        next[`nivel_${s.slot}`] =
          "Seleccione la evolución respecto al objetivo acordado previamente.";
      }
      if (!String(r?.nuevo ?? "").trim()) {
        next[`nuevo_${s.slot}`] =
          "Indique el objetivo de seguimiento o a establecer.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    console.log("[ENCUESTA] Botón Enviar → onSubmit (preventDefault aplicado)");
    if (!fase1 || !slots.length) {
      await alertWarning({
        title: "Datos insuficientes",
        text: "Cargue primero la evaluación previa: búsqueda por nombre o cédula, o use el botón Cargar evaluación previa.",
      });
      return;
    }

    if (!validate()) {
      await alertWarning({
        title: "Registro incompleto",
        text: "Complete la evolución respecto al objetivo acordado y el objetivo de seguimiento o a establecer en cada ítem.",
      });
      return;
    }

    if (!encuestadorCache) {
      await alertWarning({
        title: "Sesión",
        text: "No se encontró la cédula del encuestador. Vuelva a iniciar sesión.",
      });
      return;
    }

    const refDoc = fase1Referencia?.documento;
    const refAt = fase1Referencia?.created_at;
    if (
      refDoc == null ||
      String(refDoc).replace(/\D/g, "").length < 6 ||
      !refAt ||
      !String(refAt).trim()
    ) {
      await alertWarning({
        title: "Evaluación previa incompleta",
        text: "Falta la referencia a Logros Fase 1 (documento y fecha de la encuesta). Cargue de nuevo la evaluación con la búsqueda o con «Cargar evaluación previa».",
      });
      return;
    }

    const items = slots.map((s) => {
      const sintomaBase = mapSymptomLabel(s.sintoma);
      const sintomaLabel =
        s.sintoma === "otro" && s.otroSintomaText
          ? `${sintomaBase}: ${s.otroSintomaText}`
          : sintomaBase;
      const nivel = respuestas[String(s.slot)].nivel;
      const nuevo = respuestas[String(s.slot)].nuevo;
      return {
        slot: s.slot,
        sintoma: s.sintoma,
        sintoma_label: sintomaLabel,
        objetivo_previo_codigo: s.objetivoPrevioKey || null,
        objetivo_previo_label: String(s.objetivoPrevioLabel || "").trim() || "—",
        nivel_mejora: nivel,
        nuevo_objetivo: nuevo,
        autocompletado_desde_objetivo_previo:
          nivel === "nada" &&
          String(nuevo).trim() === String(s.objetivoPrevioKey || "").trim(),
        es_otro_sintoma: s.sintoma === "otro",
        es_meta_complementaria: false,
      };
    });

    const docPaciente = String(docBusqueda || documentoDesdeCampos() || "")
      .replace(/\D/g, "")
      .trim();

    const tipoDocF1 = String(fase1.tipo_documento || "cedula").trim();
    const preUrl = `${apiUrl("/encuestas/logros2-precheck")}?documento=${encodeURIComponent(docPaciente)}&tipo_documento=${encodeURIComponent(tipoDocF1)}`;
    let preJson = {};
    try {
      const preRes = await fetch(preUrl);
      preJson = await preRes.json().catch(() => ({}));
      if (!preRes.ok) {
        const det = preJson?.detail;
        const msg =
          typeof det === "string"
            ? det
            : det != null
              ? JSON.stringify(det)
              : "No se pudo verificar seguimientos previos.";
        await alertError({ title: "Verificación", text: msg });
        return;
      }
    } catch {
      await alertError({
        title: "Error de conexión",
        text: "No fue posible verificar si ya existe un seguimiento para este documento.",
      });
      return;
    }

    let seguimiento2PadreId = null;
    if (preJson.tiene_seguimientos_previos) {
      const okSecond = await alertConfirm({
        title: "Seguimiento adicional",
        text:
          "El documento de este usuario ya existe en nuestra base de datos. ¿Está seguro de enviar un segundo seguimiento?",
        confirmButtonText: "Sí, enviar",
        cancelButtonText: "No",
      });
      if (!okSecond.isConfirmed) {
        return;
      }
      seguimiento2PadreId = preJson.ultimo_seguimiento2_id ?? null;
      if (seguimiento2PadreId == null) {
        await alertError({
          title: "No se puede continuar",
          text:
            "Existe un registro previo pero no se pudo obtener el identificador del seguimiento anterior. Intente de nuevo o contacte al administrador.",
        });
        return;
      }
    }

    const queImpideTxt = labelsQueImpide(fase1.que_impide);
    const refDocNum = parseInt(String(refDoc).replace(/\D/g, ""), 10);
    const payload = {
      encuestador: String(encuestadorCache),
      encuestador_nombre: String(headerUsuario || "").trim() || null,
      sede: sedeFormulario,
      documento: docPaciente,
      seguimiento2_padre_id: seguimiento2PadreId,
      fase1_referencia: {
        documento: refDocNum,
        created_at: String(refAt).trim(),
      },
      items,
      fase1_resumen: {
        tipo_documento: String(fase1.tipo_documento || "cedula"),
        nombres: String(fase1.nombres || "").trim() || null,
        apellidos: String(fase1.apellidos || "").trim() || null,
        fecha_evaluacion_previa: fase1.created_at || null,
        limitacion_moverse_label: limLabel || null,
        actividades_afectadas_label: actLabel || null,
        adicional_no_puede_label: String(fase1.adicional_no_puede || "").trim() || null,
        ultima_vez_label: fase1.ultima_vez
          ? mapLastTimeLabel(fase1.ultima_vez)
          : null,
        que_impide_label: queImpideTxt !== "—" ? queImpideTxt : null,
        meta_complementaria_previa: String(fase1.objetivo_extra || "").trim() || null,
        patologia_relacionada_label: (() => {
          const code = fase1.patologia_relacionada;
          if (!code) return null;
          return PATOLOGIA_RELACIONADA_LABEL[code] || String(code);
        })(),
      },
    };

    console.log("[ENCUESTA] Payload a enviar:", payload);
    console.log("[ENCUESTA] Iniciando request...");

    sweetLoading({
      title: "Registrando…",
      text: "Guardando evaluación de seguimiento por objetivos.",
    });

    try {
      const res = await fetch(apiUrl("/encuestas/logros2"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      sweetClose();

      if (!res.ok) {
        const det = json?.detail;
        const msg =
          typeof det === "string"
            ? det
            : det != null
              ? JSON.stringify(det)
              : "Revise los datos e intente nuevamente.";
        await alertError({
          title: "No se pudo guardar",
          text: msg,
        });
        return;
      }

      const ctr = json?.encuestador_contador;
      if (
        ctr?.ok === true &&
        typeof ctr.encuestas_realizadas === "number"
      ) {
        try {
          const prev = readAutorizadoCache();
          sessionStorage.setItem(
            "wk_autorizado",
            JSON.stringify({
              ...prev,
              encuestasRealizadas: ctr.encuestas_realizadas,
            }),
          );
        } catch {
          /* ignore */
        }
        setEncuestasCount(ctr.encuestas_realizadas);
        emitPerfilActualizado({
          encuestasRealizadas: ctr.encuestas_realizadas,
        });
      }

      if (ctr?.ok !== true) {
        await alertWarning({
          title: "Registro guardado",
          text:
            typeof ctr?.error === "string" && ctr.error.trim()
              ? `La evaluación quedó registrada, pero no se actualizó el contador del profesional: ${ctr.error}`
              : "La evaluación quedó registrada, pero no se pudo actualizar el contador de encuestas del profesional en autorizados.",
        });
      } else {
        await alertSuccess({
          title: "Registro completado",
          text: "La evaluación de seguimiento quedó registrada y se sumó a tus encuestas realizadas.",
        });
      }

      setFase1(null);
      setFase1Referencia(null);
      setDocBusqueda("");
      setBusquedaTexto("");
      setSugerencias([]);
      setMostrarSugerencias(false);
      setRespuestas({});
      setErrors({});
    } catch {
      sweetClose();
      await alertError({
        title: "Error de conexión",
        text: "No fue posible comunicarse con el servidor.",
      });
    }
  };

  return (
    <>
      <WelcomeLayout image={fondo2} />

      <div className="page-encuestas page-encuesta-logros">
        <div className="content-autorizados">
          <AutorizadosHeader
            usuario={headerUsuario}
            sede={headerSede}
            correo={headerCorreo}
            sessionPin={pinSesion}
            showEncuestasCount={true}
            encuestasRealizadas={encuestasCount}
          />
        </div>

        <div className="encuesta-logros-page__main">
          <div className="encuesta-logros-wrap">
            <div className="encuesta-logros-card">
              <div className="encuesta-logros-backrow">
                <NavBackButton
                  to={encuestasListPath}
                  state={encuestasListState}
                  ariaLabel="Volver a encuestas disponibles"
                />
              </div>
              <h2 className="encuesta-logros-title">
                Evaluación de Resultados Clínicos – Fase 2
              </h2>
              <p className="encuesta-logros-sub">
                📄 Medición de resultados terapéuticos alcanzados por el paciente,
                basada en criterios funcionales y clínicos previamente definidos.
              </p>

              <div
                className="logros2-patient-search field"
                ref={busquedaWrapRef}
              >
                <label
                  className="field__label"
                  htmlFor="logros2-busqueda-paciente"
                >
                  Buscar paciente (debe existir evaluación Logros Fase 1)
                </label>
                <div className="logros2-patient-search__control">
                  <input
                    id="logros2-busqueda-paciente"
                    name="logros2-busqueda-paciente"
                    type="text"
                    className={`field__input logros2-patient-search__input${errors.docBusqueda ? " field__input--error" : ""}`}
                    value={busquedaTexto}
                    onChange={(e) => {
                      setBusquedaTexto(e.target.value);
                      setMostrarSugerencias(true);
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    placeholder="Mín. 4 letras o 5 dígitos de cédula"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={
                      mostrarSugerencias && busquedaCumpleMinimo
                    }
                    aria-controls="logros2-sugerencias-lista"
                  />
                  {mostrarSugerencias && busquedaCumpleMinimo ? (
                    <ul
                      id="logros2-sugerencias-lista"
                      className="logros2-patient-search__dropdown"
                      role="listbox"
                    >
                      {buscandoSugerencias ? (
                        <li
                          className="logros2-patient-search__hint"
                          role="presentation"
                        >
                          Buscando…
                        </li>
                      ) : null}
                      {!buscandoSugerencias && sugerencias.length === 0 ? (
                        <li
                          className="logros2-patient-search__hint"
                          role="presentation"
                        >
                          No hay coincidencias con ese texto. Pruebe otras
                          letras o más dígitos del documento, o use{" "}
                          <strong>Cargar evaluación previa</strong> con la cédula
                          completa (6–11 dígitos).
                        </li>
                      ) : null}
                      {sugerencias.map((r) => (
                        <li
                          key={`${String(r.documento ?? "")}-${String(r.created_at ?? "")}`}
                        >
                          <button
                            type="button"
                            role="option"
                            className="logros2-patient-search__option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => seleccionarPaciente(r)}
                          >
                            {etiquetaFilaPaciente(r)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {errors.docBusqueda ? (
                  <p className="field__error">{errors.docBusqueda}</p>
                ) : null}
                <p className="logros2-patient-search__help">
                  Escriba al menos <strong>4 letras</strong> del nombre o
                  apellido, o al menos <strong>5 dígitos</strong> de la cédula,
                  para buscar en la base de datos. Luego elija una fila o use{" "}
                  <strong>Cargar evaluación previa</strong> con la cédula
                  completa (6–11 dígitos).
                </p>
              </div>

              <div className="encuesta-logros-actions encuesta-logros-actions--single">
                <Button
                  type="button"
                  variant="normal"
                  disabled={cargando}
                  onClick={buscarEncuestaBase}
                >
                  {cargando ? "Consultando…" : "Cargar evaluación previa"}
                </Button>
              </div>

          {fase1 && slots.length > 0 ? (
            <form onSubmit={onSubmit}>
              <div className="logros2-chat" role="region" aria-label="Resumen clínico">
                <p style={{ margin: "0 0 0.75rem" }}>
                  En la <strong>evaluación por logros</strong> del{" "}
                  <strong>{fechaEval || "—"}</strong>, la persona evaluada{" "}
                  <strong>
                    {fase1.nombres || ""} {fase1.apellidos || ""}
                  </strong>{" "}
                  reportó una percepción de limitación <strong>{limLabel}</strong> para
                  desplazarse y desempeñar actividades como:{" "}
                  <strong>{actLabel}</strong>.
                </p>
                <p style={{ margin: 0 }}>
                  Con base en ello se priorizaron síntomas y se definieron objetivos
                  terapéuticos. Registre, para cada ítem, la evolución clínica y el
                  objetivo de seguimiento.
                </p>
                {String(fase1.objetivo_extra || "").trim() ? (
                  <p style={{ margin: "0.75rem 0 0", fontSize: "0.96rem" }}>
                    <strong>Meta complementaria consignada en aquella evaluación:</strong>{" "}
                    {String(fase1.objetivo_extra).trim()}
                  </p>
                ) : null}
                {String(fase1.adicional_no_puede || "").trim() ? (
                  <p style={{ margin: "0.65rem 0 0", fontSize: "0.96rem" }}>
                    <strong>Actividad adicional mencionada:</strong>{" "}
                    {String(fase1.adicional_no_puede).trim()}
                    {fase1.ultima_vez ? (
                      <>
                        {" "}
                        <strong>Última vez que la realizó:</strong>{" "}
                        {mapLastTimeLabel(fase1.ultima_vez)}.
                      </>
                    ) : null}{" "}
                    {labelsQueImpide(fase1.que_impide) !== "—" ? (
                      <>
                        <strong>Factores que limitan:</strong>{" "}
                        {labelsQueImpide(fase1.que_impide)}.
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              {slots.map((s) => {
                const sintomaBase = mapSymptomLabel(s.sintoma);
                const sintomaLabel =
                  s.sintoma === "otro" && s.otroSintomaText
                    ? `${sintomaBase}: ${s.otroSintomaText}`
                    : sintomaBase;

                return (
                  <div className="logros2-slot" key={s.slot}>
                    <p className="logros2-slot__title">
                      Ítem {s.slot}: {sintomaLabel}
                    </p>
                    <p className="logros2-slot__prev">
                      <strong>Objetivo acordado previamente:</strong>{" "}
                      {s.objetivoPrevioLabel}
                    </p>

                    <p className="field__label" style={{ marginBottom: 6 }}>
                      <strong>Evolución respecto a dicho objetivo</strong>{" "}
                      <span className="field__req">*</span>
                    </p>
                    <div className="logros2-radio-row">
                      {NIVEL_MEJORA.map((opt) => (
                        <label key={opt.value}>
                          <input
                            type="radio"
                            name={`nivel_${s.slot}`}
                            value={opt.value}
                            checked={
                              respuestas[String(s.slot)]?.nivel === opt.value
                            }
                            onChange={() => setNivel(s, opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {errors[`nivel_${s.slot}`] ? (
                      <p className="field__error">{errors[`nivel_${s.slot}`]}</p>
                    ) : null}

                    {s.inputMode === "select" ? (
                      <SelectInput
                        label="Objetivo de seguimiento o a establecer"
                        name={`nuevo_${s.slot}`}
                        value={respuestas[String(s.slot)]?.nuevo || ""}
                        onChange={(e) => setNuevo(s.slot, e.target.value)}
                        options={getOpcionesNuevoObjetivo(
                          s.sintoma,
                          s.objetivoPrevioKey,
                        )}
                        required
                        error={errors[`nuevo_${s.slot}`]}
                      />
                    ) : (
                      <TextField
                        label="Objetivo de seguimiento o a establecer"
                        name={`nuevo_${s.slot}`}
                        value={respuestas[String(s.slot)]?.nuevo || ""}
                        onChange={(e) => setNuevo(s.slot, e.target.value)}
                        required
                        placeholder="Describa el objetivo de seguimiento"
                        error={errors[`nuevo_${s.slot}`]}
                      />
                    )}
                  </div>
                );
              })}

              <div className="encuesta-logros-actions">
                <Button type="submit" variant="emphasis">
                  Registrar evaluación de seguimiento
                </Button>
                <NavBackButton
                  variant="icon-text"
                  to={encuestasListPath}
                  state={encuestasListState}
                  ariaLabel="Volver a encuestas disponibles"
                />
              </div>
            </form>
          ) : fase1 && slots.length === 0 ? (
            <p className="logros2-empty">
              La evaluación previa no incluye síntomas priorizados susceptibles de
              seguimiento en este formulario.
            </p>
          ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
