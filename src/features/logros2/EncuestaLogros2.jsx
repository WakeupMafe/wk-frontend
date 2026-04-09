import { useMemo, useState } from "react";
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
  alertError,
  alertSuccess,
  alertWarning,
  toastInfo,
} from "../../lib/alerts/appAlert";
import { sweetLoading, sweetClose } from "../../components/SweetAlert";

import { NIVEL_MEJORA, getOpcionesNuevoObjetivo } from "./logros2Catalog";
import {
  formatFechaEvaluacion,
  labelLimitacionNarrativa,
  labelsActividades,
  labelProblema,
  labelObjetivoPrevio,
  buildSlotsFromFase1,
} from "./logros2Formatters";

import { apiUrl } from "../../lib/api/baseUrl";

/** Solo Encuesta Logros 2 (seguimiento); `false` restaura POST real a `/encuestas/logros2`. */
const SIMULATION_MODE_LOGROS2 = true;

const SIMULATION_LOGROS2_TOAST_HTML = `
<p style="margin:0;line-height:1.45;text-align:left">Operación completada correctamente.</p>
<p style="margin:0.65rem 0 0;line-height:1.45;text-align:left"><strong>(Modo simulación)</strong> La transacción fue emulada exitosamente; no se realizó persistencia real de la información en base de datos.</p>
`.trim();

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

  const usuarioHeader = location.state?.usuario || "Usuario";
  const encuestasCount =
    location.state?.encuestasRealizadas ?? 0;

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
    usuario: usuarioHeader,
    sede: location.state?.sede || sedeFormulario,
    encuestasRealizadas: encuestasCount,
    cedula: encuestadorCache || location.state?.cedula,
    pin: location.state?.pin ?? sessionStorage.getItem("wk_pin") ?? undefined,
  };

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
  const limLabel = fase1
    ? labelLimitacionNarrativa(fase1.limitacion_moverse)
    : "";
  const actLabel = fase1 ? labelsActividades(fase1.actividades_afectadas) : "";

  const onDocChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setDocBusqueda(onlyDigits);
  };

  const buscarEncuestaBase = async () => {
    const doc = docBusqueda.trim();
    if (doc.length < 6) {
      await alertWarning({
        title: "Identificación",
        text: "Ingrese un número de documento válido (mínimo 6 dígitos).",
      });
      return;
    }

    setCargando(true);
    setErrors({});
    try {
      const res = await fetch(
        `${apiUrl(`/verificacion/logros-fase1/${encodeURIComponent(doc)}`)}`,
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFase1(null);
        await alertWarning({
          title: "Sin evaluación previa",
          text:
            json?.detail ||
            "No existe registro de la evaluación por logros (Fase 1) para este documento. Debe completarse primero dicha evaluación.",
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
        text: "No fue posible recuperar la evaluación previa. Intente nuevamente.",
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
        next[`nivel_${s.slot}`] = "Indique la evolución respecto al objetivo previo.";
      }
      if (!r?.nuevo) {
        next[`nuevo_${s.slot}`] = "Indique el objetivo de seguimiento.";
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
        text: "Cargue primero la evaluación previa mediante el número de documento.",
      });
      return;
    }

    if (!validate()) {
      await alertWarning({
        title: "Registro incompleto",
        text: "Complete la evolución y el objetivo de seguimiento en cada ítem priorizado.",
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

    const payload = {
      encuestador: String(encuestadorCache),
      sede: sedeFormulario,
      documento: docBusqueda.trim(),
      id_encuesta_fase1: fase1.id_int,
      items,
    };

    if (SIMULATION_MODE_LOGROS2) {
      console.log("[ENCUESTA LOGROS 2] Submit capturado");
      console.log("[ENCUESTA LOGROS 2] Modo simulación activo");

      sweetLoading({
        title: "Registrando…",
        text: "Guardando evaluación de seguimiento por objetivos.",
      });

      await new Promise((resolve) => setTimeout(resolve, 450));

      sweetClose();
      console.log("[ENCUESTA LOGROS 2] Persistencia omitida intencionalmente");

      toastInfo({
        html: SIMULATION_LOGROS2_TOAST_HTML,
        timer: 4000,
      });

      setFase1(null);
      setDocBusqueda("");
      setRespuestas({});
      setErrors({});

      console.log("[ENCUESTA LOGROS 2] Flujo finalizado con éxito simulado");
      return;
    }

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
        await alertError({
          title: "No se pudo guardar",
          text:
            typeof json?.detail === "string"
              ? json.detail
              : "Revise los datos e intente nuevamente.",
        });
        return;
      }

      const res2 = await fetch(apiUrl("/autorizados/incrementar-encuesta"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: String(encuestadorCache),
          incremento: 1,
        }),
      });

      if (!res2.ok) {
        await alertWarning({
          title: "Registro guardado",
          text: "No se pudo actualizar el contador de encuestas del profesional.",
        });
      } else {
        await alertSuccess({
          title: "Registro completado",
          text: "La evaluación de seguimiento quedó registrada correctamente.",
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
    <>
      <WelcomeLayout image={fondo2} />

      <div className="page-encuestas page-encuesta-logros">
        <div className="content-autorizados">
          <AutorizadosHeader
            usuario={usuarioHeader}
            sede={location.state?.sede || sedeFormulario}
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
                Seguimiento clínico por objetivos (Logros 2)
              </h2>
              <p className="encuesta-logros-sub">
                Registro estructurado a partir de la evaluación previa por logros
                (Fase 1), para documentar evolución y nuevos objetivos terapéuticos.
              </p>

              <TextField
                label="Número de identificación del paciente (debe coincidir con Logros Fase 1)"
                name="docBusqueda"
                value={docBusqueda}
                onChange={onDocChange}
                placeholder="Solo dígitos"
                maxLength={11}
                required={false}
                error={errors.docBusqueda}
              />

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
                  <strong>{fechaEval || "—"}</strong>, el/la paciente{" "}
                  <strong>
                    {fase1.nombres || ""} {fase1.apellidos || ""}
                  </strong>{" "}
                  reportó una percepción de limitación <strong>{limLabel}</strong> para
                  el desplazamiento y el desempeño en actividades como:{" "}
                  <strong>{actLabel}</strong>.
                </p>
                <p style={{ margin: 0 }}>
                  Con base en lo anterior se priorizaron síntomas y se definieron
                  objetivos terapéuticos. A continuación registre, para cada ítem, la
                  evolución observada y el objetivo de seguimiento.
                </p>
                {fase1.objetivo_extra?.trim() ? (
                  <p style={{ margin: "0.75rem 0 0", fontSize: "0.96rem" }}>
                    <strong>Meta complementaria</strong> consignada en aquella
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
                      <strong>Objetivo acordado previamente:</strong> {prevObjLabel}
                    </p>

                    <p className="field__label" style={{ marginBottom: 6 }}>
                      Evolución respecto a dicho objetivo{" "}
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
                      label="Objetivo de seguimiento a establecer"
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
