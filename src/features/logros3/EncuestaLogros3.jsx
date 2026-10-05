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
import "./EncuestaLogros3.css";

import fondo2 from "../../assets/fondo2.svg";

import {
  alertConfirm,
  alertError,
  alertInfo,
  alertSuccess,
  alertWarning,
} from "../../lib/alerts/appAlert";
import { sweetLoading, sweetClose } from "../../components/SweetAlert";
import RegistrosExistentesNotice from "../../components/RegistrosExistentesNotice";
import PatientSearchHelpButton from "../../components/PatientSearchHelpButton";
import {
  buildRegistrosExistentesHtml,
  fetchRegistrosPorDocumento,
} from "../../lib/encuestas/registrosExistentes";

/** Ayuda búsqueda paciente — Fase 3 (requiere Logros 2). */
const BUSQUEDA_PACIENTE_HELP_HTML = `
  <div style="text-align:left;line-height:1.45;font-size:0.95rem">
    <p style="margin:0 0 0.75rem">
      Escriba al menos <strong>4 letras</strong> del nombre o apellido, o al menos
      <strong>5 dígitos</strong> de la cédula, para buscar en la base de datos.
      Luego elija una fila o use <strong>Cargar evaluación Logros 2</strong> con la
      cédula completa (6–11 dígitos).
    </p>
    <p style="margin:0">
      El paciente debe tener una evaluación <strong>Logros 2</strong> (Fase 2) previa
      que aún no tenga una <strong>Logros 3</strong> vinculada (solo una L3 por cada L2).
    </p>
  </div>
`.trim();

import { NIVEL_MEJORA, getOpcionesNuevoObjetivo } from "../logros2/logros2Catalog";
import {
  formatFechaEvaluacion,
  mapSymptomLabel,
  buildSlotsFromLogros2,
  normalizeLogros2Row,
  etiquetaLogros2Opcion,
} from "./logros3Formatters";

import { apiUrl } from "../../lib/api/baseUrl";
import {
  WK_PERFIL_ACTUALIZADO,
  emitPerfilActualizado,
  readAutorizadoCache,
} from "../../lib/autorizadoPerfilEvents";

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

export default function EncuestaLogros3() {
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
    sede: sedeParam || sedeFormulario,
    sedeCarpeta: sedeParam || sedeFormulario,
    encuestasRealizadas: encuestasCount,
    cedula: encuestadorCache || location.state?.cedula,
    pin: pinSesion,
  };

  const [docBusqueda, setDocBusqueda] = useState("");
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const busquedaWrapRef = useRef(null);
  const skipBusquedaRef = useRef(false);

  /** @type {Record<string, unknown>|null} */
  const [logros2, setLogros2] = useState(null);
  /** @type {Record<string, unknown>[]} */
  const [candidatosL2, setCandidatosL2] = useState([]);
  const [candidatoSeleccionadoId, setCandidatoSeleccionadoId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrosExistentes, setRegistrosExistentes] = useState([]);
  const [registrosExistentesLoading, setRegistrosExistentesLoading] =
    useState(false);

  /** @type {Record<string, { nivel: string; nuevo: string }>} */
  const [respuestas, setRespuestas] = useState({});

  const slots = useMemo(
    () => (logros2 ? buildSlotsFromLogros2(logros2) : []),
    [logros2],
  );

  const busquedaCumpleMinimo = useMemo(() => {
    const q = busquedaTexto.trim();
    const digitos = q.replace(/\D/g, "").length;
    const letras = q.replace(/[^\p{L}]/gu, "").length;
    return letras >= 4 || digitos >= 5;
  }, [busquedaTexto]);

  const fechaEval = logros2 ? formatFechaEvaluacion(logros2.created_at) : "";
  const limLabel = logros2
    ? String(logros2.limitacion_moverse_label || "").trim() || "—"
    : "";
  const actLabel = logros2
    ? String(logros2.actividades_afectadas_label || "").trim() || "—"
    : "";
  const codigoL2 = logros2
    ? String(logros2.codigo_seguimiento || "").trim()
    : "";

  const documentoDesdeCampos = () => {
    const d = docBusqueda.replace(/\D/g, "").trim();
    if (d.length >= 6) return d;
    return busquedaTexto.replace(/\D/g, "").trim();
  };

  const etiquetaFilaPaciente = (r) => {
    const nom = `${r.nombres || ""} ${r.apellidos || ""}`.trim() || "Sin nombre";
    const doc = String(r.documento ?? "");
    const sedeR = String(r.sede ?? "").trim();
    const codigo = String(r.codigo_seguimiento ?? "").trim();
    const base = `${nom} · Doc. ${doc}${sedeR ? ` · ${sedeR}` : ""}`;
    return codigo ? `${base} · ${codigo}` : base;
  };

  const aplicarLogros2Seleccionado = (row) => {
    const normalized = normalizeLogros2Row(row);
    setLogros2(normalized);
    const built = buildSlotsFromLogros2(normalized);
    const init = {};
    for (const s of built) {
      init[String(s.slot)] = { nivel: "", nuevo: "" };
    }
    setRespuestas(init);
    setCandidatosL2([]);
    setCandidatoSeleccionadoId("");
  };

  const cargarHistorialDocumento = async (doc) => {
    setRegistrosExistentesLoading(true);
    try {
      const regPack = await fetchRegistrosPorDocumento(doc);
      const regs = Array.isArray(regPack?.registros) ? regPack.registros : [];
      setRegistrosExistentes(regs);
      if (regPack?.ok && regs.length > 0) {
        const footnote =
          (regPack.conteo?.logros3 || 0) > 0
            ? "Ya hay seguimientos Logros 3 para este documento. Solo puede crear otra Logros 3 a partir de una Logros 2 que aún no tenga una vinculada."
            : "Se muestra el historial del documento. Puede continuar con el seguimiento Logros 3.";
        await alertInfo({
          title: "Encuestas registradas para este documento",
          html: buildRegistrosExistentesHtml(regs, { footnote }),
        });
      }
    } catch {
      setRegistrosExistentes([]);
    } finally {
      setRegistrosExistentesLoading(false);
    }
  };

  /**
   * Lista Logros 2 del documento; aplica 0 / 1 / N.
   * @param {string} docRaw
   * @param {number|string|null} [preferId]
   */
  const cargarLogros2PorDocumento = async (docRaw, preferId = null) => {
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
    setLogros2(null);
    setCandidatosL2([]);
    setCandidatoSeleccionadoId("");
    setRespuestas({});

    try {
      const url = `${apiUrl("/encuestas/logros2-por-documento")}?documento=${encodeURIComponent(doc)}`;
      console.log("[L3 LOAD] url=", url);
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      console.log("[L3 LOAD] status=", res.status, "json=", json);

      if (!res.ok) {
        setRegistrosExistentes([]);
        await alertWarning({
          title: "Sin evaluación Logros 2",
          text:
            json?.detail ||
            "No existe registro de la evaluación Logros 2 (Fase 2) para este documento. Debe completarse primero dicha evaluación.",
        });
        return false;
      }

      const lista = Array.isArray(json?.resultados) ? json.resultados : [];
      if (!lista.length) {
        setRegistrosExistentes([]);
        if (
          json?.todas_tienen_logros3 ||
          Number(json?.cantidad_con_logros3 || 0) > 0
        ) {
          const nL2 = Number(json?.cantidad_total_logros2 || 0);
          const nL3 = Number(json?.cantidad_con_logros3 || 0);
          await alertWarning({
            title: "Logros 3 ya registrada",
            text:
              nL2 <= 1
                ? "Este documento ya tiene una Encuesta de Logros 3 vinculada a su evaluación Logros 2. Solo se permite una Logros 3 por cada Logros 2."
                : `Este documento tiene ${nL2} evaluaciones Logros 2 y ya existe Logros 3 para ${nL3 === nL2 ? "todas" : nL3} de ellas. No queda ninguna Logros 2 disponible para crear una nueva Logros 3.`,
          });
        } else {
          await alertWarning({
            title: "Sin evaluación Logros 2",
            text: "Este documento no tiene encuestas de Logros 2. Complete primero la Evaluación de Resultados Clínicos – Fase 2.",
          });
        }
        return false;
      }

      setDocBusqueda(doc);

      const preferNum =
        preferId != null && String(preferId).trim() !== ""
          ? Number(preferId)
          : null;

      if (lista.length === 1) {
        aplicarLogros2Seleccionado(lista[0]);
        setMostrarSugerencias(false);
        await cargarHistorialDocumento(doc);
        return true;
      }

      if (
        preferNum != null &&
        Number.isFinite(preferNum) &&
        lista.some((r) => Number(r.id) === preferNum)
      ) {
        const chosen = lista.find((r) => Number(r.id) === preferNum);
        aplicarLogros2Seleccionado(chosen);
        setMostrarSugerencias(false);
        await cargarHistorialDocumento(doc);
        return true;
      }

      if (
        preferNum != null &&
        Number.isFinite(preferNum) &&
        !lista.some((r) => Number(r.id) === preferNum)
      ) {
        await alertWarning({
          title: "Logros 3 ya registrada",
          text: "La evaluación Logros 2 seleccionada ya tiene una Encuesta de Logros 3. Elija otra Logros 2 disponible, si existe.",
        });
      }

      // Varias Logros 2 elegibles → elegir
      setCandidatosL2(lista);
      setCandidatoSeleccionadoId(String(lista[0]?.id ?? ""));
      setMostrarSugerencias(false);
      await alertInfo({
        title: "Varias evaluaciones Logros 2",
        text: `Hay ${lista.length} encuesta(s) de Logros 2 disponibles (sin Logros 3 aún) para este documento. Elija a partir de cuál desea realizar la Encuesta de Logros 3.`,
      });
      await cargarHistorialDocumento(doc);
      return true;
    } catch (e) {
      console.log("[L3 LOAD] error=", e?.message);
      setLogros2(null);
      setCandidatosL2([]);
      setRegistrosExistentes([]);
      await alertError({
        title: "Error",
        text: "No fue posible recuperar las evaluaciones Logros 2. Intente nuevamente.",
      });
      return false;
    } finally {
      setCargando(false);
    }
  };

  const confirmarCandidatoL2 = () => {
    const id = Number(candidatoSeleccionadoId);
    const chosen = candidatosL2.find((r) => Number(r.id) === id);
    if (!chosen) {
      void alertWarning({
        title: "Selección requerida",
        text: "Seleccione una encuesta de Logros 2 para continuar.",
      });
      return;
    }
    aplicarLogros2Seleccionado(chosen);
  };

  const buscarEncuestaBase = async () => {
    const doc = documentoDesdeCampos();
    await cargarLogros2PorDocumento(doc);
  };

  const seleccionarPaciente = (r) => {
    const doc = String(r.documento ?? "").replace(/\D/g, "").trim();
    skipBusquedaRef.current = true;
    setBusquedaTexto(etiquetaFilaPaciente(r));
    setDocBusqueda(doc);
    setMostrarSugerencias(false);
    setSugerencias([]);
    void cargarLogros2PorDocumento(doc, r.id ?? null);
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
    console.log("[L3 BUSQUEDA] texto(raw)=", JSON.stringify(busquedaTexto));
    console.log("[L3 BUSQUEDA] letras=", letras, "digitos=", digitos);
    if (!busquedaCumpleMinimo) {
      setSugerencias([]);
      setBuscandoSugerencias(false);
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setBuscandoSugerencias(true);
      try {
        const params = new URLSearchParams({ q, limit: "25" });
        const url = apiUrl(`/encuestas/buscar-logros2?${params.toString()}`);
        console.log("[L3 BUSQUEDA] url=", url);
        const res = await fetch(url, { signal: ctrl.signal });
        const text = await res.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
          json = {};
        }
        console.log("[L3 BUSQUEDA] status=", res.status, "body=", text);
        if (!res.ok) {
          setSugerencias([]);
          return;
        }
        setSugerencias(Array.isArray(json?.resultados) ? json.resultados : []);
      } catch (e) {
        console.log("[L3 BUSQUEDA] fetch error=", e?.name, e?.message);
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
    console.log("[ENCUESTA L3] Botón Enviar → onSubmit");
    if (!logros2 || !slots.length) {
      await alertWarning({
        title: "Datos insuficientes",
        text: "Cargue primero una evaluación Logros 2: búsqueda por nombre o cédula, o use el botón Cargar evaluación Logros 2.",
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

    const l2Id = Number(logros2.id);
    if (!Number.isFinite(l2Id) || l2Id <= 0) {
      await alertWarning({
        title: "Evaluación Logros 2 incompleta",
        text: "Falta el identificador de la encuesta Logros 2 de referencia. Cargue de nuevo la evaluación.",
      });
      return;
    }

    const items = slots.map((s) => {
      const sintomaBase = mapSymptomLabel(s.sintoma);
      const sintomaLabel =
        s.sintomaLabel ||
        (s.sintoma === "otro" && s.otroSintomaText
          ? `${sintomaBase}: ${s.otroSintomaText}`
          : sintomaBase);
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

    const tipoDoc = String(logros2.tipo_documento || "cedula").trim();
    const preUrl = `${apiUrl("/encuestas/logros3-precheck")}?documento=${encodeURIComponent(docPaciente)}&tipo_documento=${encodeURIComponent(tipoDoc)}&seguimiento2_id=${encodeURIComponent(String(l2Id))}`;
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
        text: "No fue posible verificar si ya existe un seguimiento Logros 3 para este documento.",
      });
      return;
    }

    if (preJson.tiene_logros3_para_este_l2) {
      const cod = String(preJson.codigo_logros3_para_este_l2 || "").trim();
      await alertWarning({
        title: "Logros 3 ya registrada",
        text: cod
          ? `Ya existe una Encuesta de Logros 3 (${cod}) para esta evaluación Logros 2. Solo se permite una Logros 3 por cada Logros 2. Elija otra Logros 2 si el paciente tiene más de una.`
          : "Ya existe una Encuesta de Logros 3 para esta evaluación Logros 2. Solo se permite una Logros 3 por cada Logros 2. Elija otra Logros 2 si el paciente tiene más de una.",
      });
      return;
    }

    let seguimiento3PadreId = null;
    if (preJson.tiene_seguimientos_previos) {
      let confirmHtml = "";
      let confirmText =
        "El documento de este usuario ya tiene un seguimiento Logros 3 (de otra evaluación Logros 2). ¿Está seguro de enviar un segundo seguimiento a partir de otra Logros 2?";
      try {
        const regPack = await fetchRegistrosPorDocumento(docPaciente);
        const regs = Array.isArray(regPack?.registros) ? regPack.registros : [];
        if (regs.length > 0) {
          setRegistrosExistentes(regs);
          confirmHtml = buildRegistrosExistentesHtml(regs, {
            intro:
              "El documento de este usuario ya tiene encuestas registradas. ¿Está seguro de enviar un seguimiento Logros 3 adicional a partir de otra evaluación Logros 2?",
          });
          confirmText = "";
        }
      } catch {
        /* mensaje genérico */
      }
      const okSecond = await alertConfirm({
        title: "Seguimiento adicional",
        text: confirmText,
        html: confirmHtml,
        confirmButtonText: "Sí, enviar",
        cancelButtonText: "No",
      });
      if (!okSecond.isConfirmed) return;
      seguimiento3PadreId = preJson.ultimo_seguimiento3_id ?? null;
      if (seguimiento3PadreId == null) {
        await alertError({
          title: "No se puede continuar",
          text: "Existe un registro Logros 3 previo pero no se pudo obtener su identificador. Intente de nuevo o contacte al administrador.",
        });
        return;
      }
    }

    const payload = {
      encuestador: String(encuestadorCache),
      encuestador_nombre: String(headerUsuario || "").trim() || null,
      sede: sedeFormulario,
      documento: docPaciente,
      seguimiento3_padre_id: seguimiento3PadreId,
      logros2_referencia: {
        id: l2Id,
        codigo_seguimiento: codigoL2 || null,
        documento: Number(docPaciente),
        created_at: logros2.created_at || null,
      },
      items,
      logros2_resumen: {
        tipo_documento: tipoDoc,
        nombres: String(logros2.nombres || "").trim() || null,
        apellidos: String(logros2.apellidos || "").trim() || null,
        fecha_evaluacion_previa: logros2.created_at || null,
        codigo_seguimiento: codigoL2 || null,
        limitacion_moverse_label: limLabel !== "—" ? limLabel : null,
        actividades_afectadas_label: actLabel !== "—" ? actLabel : null,
        adicional_no_puede_label:
          String(logros2.adicional_no_puede_label || "").trim() || null,
        ultima_vez_label: String(logros2.ultima_vez_label || "").trim() || null,
        que_impide_label: String(logros2.que_impide_label || "").trim() || null,
        meta_complementaria_previa:
          String(logros2.meta_complementaria_previa || "").trim() || null,
      },
    };

    console.log("[ENCUESTA L3] Payload:", payload);

    sweetLoading({
      title: "Registrando…",
      text: "Guardando evaluación de seguimiento Logros 3.",
    });

    try {
      const res = await fetch(apiUrl("/encuestas/logros3"), {
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
        await alertError({ title: "No se pudo guardar", text: msg });
        return;
      }

      const ctr = json?.encuestador_contador;
      if (ctr?.ok === true && typeof ctr.encuestas_realizadas === "number") {
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
        const codigoNuevo =
          json?.data?.seguimiento3?.codigo_seguimiento ||
          json?.data?.codigo_seguimiento ||
          "";
        await alertSuccess({
          title: "Registro completado",
          text: codigoNuevo
            ? `La evaluación Logros 3 quedó registrada (${codigoNuevo}) y se sumó a tus encuestas realizadas.`
            : "La evaluación Logros 3 quedó registrada y se sumó a tus encuestas realizadas.",
        });
      }

      setLogros2(null);
      setCandidatosL2([]);
      setCandidatoSeleccionadoId("");
      setDocBusqueda("");
      setBusquedaTexto("");
      setSugerencias([]);
      setMostrarSugerencias(false);
      setRespuestas({});
      setErrors({});
      setRegistrosExistentes([]);
    } catch {
      sweetClose();
      await alertError({
        title: "Error de conexión",
        text: "No fue posible comunicarse con el servidor.",
      });
    }
  };

  const mostrandoSelector = candidatosL2.length > 1 && !logros2;

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
                <PatientSearchHelpButton
                  title="Ayuda: buscar paciente"
                  ariaLabel="Ayuda sobre cómo buscar paciente en Fase 3"
                  html={BUSQUEDA_PACIENTE_HELP_HTML}
                />
              </div>
              <h2 className="encuesta-logros-title">
                Evaluación de Resultados Clínicos – Fase 3
              </h2>
              <p className="encuesta-logros-sub">
                📄 Seguimiento de resultados, a partir de la encuesta de Logros 2
              </p>

              <div
                className="logros2-patient-search field"
                ref={busquedaWrapRef}
              >
                <label
                  className="field__label"
                  htmlFor="logros3-busqueda-paciente"
                >
                  Buscar paciente
                </label>
                <div className="logros2-patient-search__control">
                  <input
                    id="logros3-busqueda-paciente"
                    name="logros3-busqueda-paciente"
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
                    aria-controls="logros3-sugerencias-lista"
                  />
                  {mostrarSugerencias && busquedaCumpleMinimo ? (
                    <ul
                      id="logros3-sugerencias-lista"
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
                          No hay coincidencias de Logros 2 con ese texto. Pruebe
                          otras letras o más dígitos, o use{" "}
                          <strong>Cargar evaluación Logros 2</strong> con la
                          cédula completa (6–11 dígitos).
                        </li>
                      ) : null}
                      {sugerencias.map((r) => (
                        <li
                          key={`${String(r.id ?? "")}-${String(r.documento ?? "")}-${String(r.created_at ?? "")}`}
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
              </div>

              <div className="encuesta-logros-actions encuesta-logros-actions--single">
                <Button
                  type="button"
                  variant="normal"
                  disabled={cargando}
                  onClick={buscarEncuestaBase}
                >
                  {cargando ? "Consultando…" : "Cargar evaluación Logros 2"}
                </Button>
              </div>

              <RegistrosExistentesNotice
                registros={registrosExistentes}
                loading={registrosExistentesLoading}
              />

              {mostrandoSelector ? (
                <div className="logros3-pick" role="region" aria-label="Elegir Logros 2">
                  <p className="logros3-pick__title">
                    Seleccione una encuesta de Logros 2 disponible (sin Logros 3 aún)
                  </p>
                  <ul className="logros3-pick__list">
                    {candidatosL2.map((r) => {
                      const idStr = String(r.id ?? "");
                      return (
                        <li key={idStr}>
                          <label className="logros3-pick__option">
                            <input
                              type="radio"
                              name="logros3_candidato_l2"
                              value={idStr}
                              checked={candidatoSeleccionadoId === idStr}
                              onChange={() => setCandidatoSeleccionadoId(idStr)}
                            />
                            <span>{etiquetaLogros2Opcion(r)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="encuesta-logros-actions encuesta-logros-actions--single" style={{ marginTop: "0.85rem" }}>
                    <Button
                      type="button"
                      variant="emphasis"
                      onClick={confirmarCandidatoL2}
                    >
                      Continuar con esta Logros 2
                    </Button>
                  </div>
                </div>
              ) : null}

              {logros2 && slots.length > 0 ? (
                <form onSubmit={onSubmit}>
                  <div className="logros3-chat" role="region" aria-label="Resumen Logros 2">
                    <p style={{ margin: "0 0 0.75rem" }}>
                      En la <strong>evaluación Logros 2</strong>
                      {codigoL2 ? (
                        <>
                          {" "}
                          (<strong>{codigoL2}</strong>)
                        </>
                      ) : null}{" "}
                      del <strong>{fechaEval || "—"}</strong>, la persona
                      evaluada{" "}
                      <strong>
                        {logros2.nombres || ""} {logros2.apellidos || ""}
                      </strong>{" "}
                      tenía registrada una percepción de limitación{" "}
                      <strong>{limLabel}</strong> y actividades como:{" "}
                      <strong>{actLabel}</strong>.
                    </p>
                    <p style={{ margin: 0 }}>
                      Con base en los objetivos de seguimiento definidos en
                      Logros 2, registre la evolución clínica y el nuevo objetivo
                      de seguimiento (Logros 3).
                    </p>
                    {String(logros2.meta_complementaria_previa || "").trim() ? (
                      <p style={{ margin: "0.75rem 0 0", fontSize: "0.96rem" }}>
                        <strong>Meta complementaria previa:</strong>{" "}
                        {String(logros2.meta_complementaria_previa).trim()}
                      </p>
                    ) : null}
                  </div>

                  {slots.map((s) => {
                    const sintomaLabel =
                      s.sintomaLabel ||
                      (s.sintoma === "otro" && s.otroSintomaText
                        ? `${mapSymptomLabel(s.sintoma)}: ${s.otroSintomaText}`
                        : mapSymptomLabel(s.sintoma));

                    return (
                      <div className="logros2-slot" key={s.slot}>
                        <p className="logros2-slot__title">
                          Ítem {s.slot}: {sintomaLabel}
                        </p>
                        <p className="logros2-slot__prev">
                          <strong>Objetivo acordado en Logros 2:</strong>{" "}
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
                          <p className="field__error">
                            {errors[`nivel_${s.slot}`]}
                          </p>
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
                      Registrar evaluación Logros 3
                    </Button>
                    <NavBackButton
                      variant="icon-text"
                      to={encuestasListPath}
                      state={encuestasListState}
                      ariaLabel="Volver a encuestas disponibles"
                    />
                  </div>
                </form>
              ) : logros2 && slots.length === 0 ? (
                <p className="logros2-empty">
                  La evaluación Logros 2 seleccionada no incluye ítems
                  susceptibles de seguimiento en este formulario.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
