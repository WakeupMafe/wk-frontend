import { useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import SelectInput from "../../components/SelectInput";
import "../../components/SweetAlert.css";
import "../../components/TextInput.css";
import "../../components/EncuestaLogrosWKP.css";
import "./EncuestaLogros2.css";

import { alertError, alertSuccess, alertWarning } from "../../lib/alerts/appAlert";
import { sweetLoading, sweetClose } from "../../components/SweetAlert";

import { NIVEL_MEJORA, getOpcionesNuevoObjetivo } from "./logros2Catalog";
import {
  formatFechaEvaluacion,
  labelLimitacion,
  labelsActividades,
  labelProblema,
  labelObjetivoPrevio,
  buildSlotsFromFase1,
} from "./logros2Formatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
  const navigate = useNavigate();
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

  const [docBusqueda, setDocBusqueda] = useState("");
  const [fase1, setFase1] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState({});

  /** @type {Record<string, { nivel: string; nuevo: string }>} */
  const [respuestas, setRespuestas] = useState({});

  const slots = useMemo(
    () => (fase1 ? buildSlotsFromFase1(fase1) : []),
    [fase1],
  );

  const fechaEval = fase1 ? formatFechaEvaluacion(fase1.created_at) : "";
  const limLabel = fase1 ? labelLimitacion(fase1.limitacion_moverse) : "";
  const actLabel = fase1 ? labelsActividades(fase1.actividades_afectadas) : "";

  const onDocChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setDocBusqueda(onlyDigits);
  };

  const buscarEncuestaBase = async () => {
    const doc = docBusqueda.trim();
    if (doc.length < 6) {
      await alertWarning({
        title: "Documento",
        text: "Ingrese un documento válido (mínimo 6 dígitos).",
      });
      return;
    }

    setCargando(true);
    setErrors({});
    try {
      const res = await fetch(
        `${API_URL}/verificacion/logros-fase1/${encodeURIComponent(doc)}`,
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFase1(null);
        await alertWarning({
          title: "Sin encuesta previa",
          text:
            json?.detail ||
            "No hay encuesta de Logros (fase 1) para este documento. Primero debe completarse esa encuesta.",
        });
        return;
      }

      const row = json?.data;
      if (!row) {
        setFase1(null);
        return;
      }

      setFase1(row);
      const built = buildSlotsFromFase1(row);
      const init = {};
      for (const s of built) {
        init[String(s.slot)] = { nivel: "", nuevo: "" };
      }
      setRespuestas(init);
    } catch {
      await alertError({
        title: "Error",
        text: "No se pudo consultar la encuesta anterior.",
      });
    } finally {
      setCargando(false);
    }
  };

  const setNivel = (slot, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [String(slot)]: { ...prev[String(slot)], nivel: value },
    }));
  };

  const setNuevo = (slot, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [String(slot)]: { ...prev[String(slot)], nuevo: value },
    }));
  };

  const validate = () => {
    const next = {};
    for (const s of slots) {
      const r = respuestas[String(s.slot)];
      if (!r?.nivel) {
        next[`nivel_${s.slot}`] = "Seleccione el nivel de mejora.";
      }
      if (!r?.nuevo) {
        next[`nuevo_${s.slot}`] = "Seleccione el nuevo objetivo.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!fase1 || !slots.length) {
      await alertWarning({
        title: "Encuesta incompleta",
        text: "Busque primero la encuesta anterior por documento.",
      });
      return;
    }

    if (!validate()) {
      await alertWarning({
        title: "Faltan datos",
        text: "Complete nivel de mejora y nuevo objetivo en cada síntoma.",
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

    const items = slots.map((s) => ({
      slot: s.slot,
      sintoma: s.sintoma,
      nivel_mejora: respuestas[String(s.slot)].nivel,
      nuevo_objetivo: respuestas[String(s.slot)].nuevo,
    }));

    sweetLoading({
      title: "Enviando…",
      text: "Guardando seguimiento de logros.",
    });

    try {
      const res = await fetch(`${API_URL}/encuestas/logros2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encuestador: String(encuestadorCache),
          sede: sedeFormulario,
          documento: docBusqueda.trim(),
          id_encuesta_fase1: fase1.id_int,
          items,
        }),
      });

      const json = await res.json().catch(() => ({}));
      sweetClose();

      if (!res.ok) {
        await alertError({
          title: "No se pudo guardar",
          text:
            typeof json?.detail === "string"
              ? json.detail
              : "Revise los datos e intente nuevamente.",
        });
        return;
      }

      const res2 = await fetch(`${API_URL}/autorizados/incrementar-encuesta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: String(encuestadorCache),
          incremento: 1,
        }),
      });

      if (!res2.ok) {
        await alertWarning({
          title: "Seguimiento guardado",
          text: "No se pudo actualizar el contador del encuestador.",
        });
      } else {
        await alertSuccess({
          title: "Listo",
          text: "Encuesta de seguimiento registrada correctamente.",
        });
      }

      setFase1(null);
      setDocBusqueda("");
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
    <div className="ContentEncuesta">
      <div className="logros2-wrap">
        <div className="logros2-card">
          <h2 className="logros2-title">Encuesta de seguimiento (Logros 2)</h2>
          <p className="logros2-sub">
            Conversación clínica a partir de la última evaluación por logros del
            paciente.
          </p>

          <TextField
            label="Documento del paciente (misma encuesta de Logros Fase 1)"
            name="docBusqueda"
            value={docBusqueda}
            onChange={onDocChange}
            placeholder="Solo números"
            maxLength={11}
            required={false}
            error={errors.docBusqueda}
          />

          <div className="contenedor-botones" style={{ paddingTop: 8 }}>
            <button
              type="button"
              className="botones botonenvio"
              disabled={cargando}
              onClick={buscarEncuestaBase}
            >
              {cargando ? "Buscando…" : "Buscar encuesta anterior"}
            </button>
          </div>

          {fase1 && slots.length > 0 ? (
            <form onSubmit={onSubmit}>
              <div className="logros2-chat" role="region" aria-label="Resumen clínico">
                <p style={{ margin: "0 0 0.75rem" }}>
                  En la última <strong>evaluación por logros</strong>, realizada el{" "}
                  <strong>{fechaEval || "—"}</strong>,{" "}
                  <strong>
                    {fase1.nombres || ""} {fase1.apellidos || ""}
                  </strong>{" "}
                  refirió una limitación <strong>{limLabel}</strong> para moverse y
                  realizar actividades como: <strong>{actLabel}</strong>.
                </p>
                <p style={{ margin: 0 }}>
                  A partir de ahí definimos objetivos según los síntomas que eligió.
                  A continuación, revise la mejora y el nuevo objetivo para cada uno.
                </p>
                {fase1.objetivo_extra?.trim() ? (
                  <p style={{ margin: "0.75rem 0 0", fontSize: "0.96rem" }}>
                    <strong>Objetivo adicional</strong> que había planteado en esa
                    evaluación: {fase1.objetivo_extra.trim()}
                  </p>
                ) : null}
              </div>

              {slots.map((s) => {
                const sintomaLabel =
                  s.sintoma === "otro" && fase1.otro_sintoma
                    ? `${labelProblema(s.sintoma)} (${fase1.otro_sintoma})`
                    : labelProblema(s.sintoma);

                const prevObjLabel = labelObjetivoPrevio(
                  s.sintoma,
                  s.objetivoPrevio,
                );

                return (
                  <div className="logros2-slot" key={s.slot}>
                    <p className="logros2-slot__title">
                      {s.slot}. {sintomaLabel}
                    </p>
                    <p className="logros2-slot__prev">
                      <strong>Objetivo anterior:</strong> {prevObjLabel}
                    </p>

                    <p className="field__label" style={{ marginBottom: 6 }}>
                      ¿Nivel de mejora respecto a ese objetivo?{" "}
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
                            onChange={() => setNivel(s.slot, opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {errors[`nivel_${s.slot}`] ? (
                      <p className="field__error">{errors[`nivel_${s.slot}`]}</p>
                    ) : null}

                    <SelectInput
                      label="Tu nuevo objetivo es"
                      name={`nuevo_${s.slot}`}
                      value={respuestas[String(s.slot)]?.nuevo || ""}
                      onChange={(e) => setNuevo(s.slot, e.target.value)}
                      options={getOpcionesNuevoObjetivo(s.sintoma)}
                      required
                      error={errors[`nuevo_${s.slot}`]}
                    />
                  </div>
                );
              })}

              <div className="contenedor-botones">
                <button className="botones botonenvio" type="submit">
                  Enviar seguimiento
                </button>
                <button
                  type="button"
                  className="botones"
                  onClick={() => {
                    const s = sedeParam || sedeFormulario;
                    navigate(`/sede/${encodeURIComponent(s)}/encuestas`, {
                      state: {
                        usuario: location.state?.usuario,
                        sede: location.state?.sede || s,
                        encuestasRealizadas: location.state?.encuestasRealizadas,
                        cedula: encuestadorCache || location.state?.cedula,
                      },
                    });
                  }}
                >
                  Volver
                </button>
              </div>
            </form>
          ) : fase1 && slots.length === 0 ? (
            <p className="textos" style={{ marginTop: 16 }}>
              La encuesta anterior no tiene síntomas registrados para seguimiento.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
