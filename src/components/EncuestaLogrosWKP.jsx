import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import SelectInput from "./SelectInput";
import AutorizadosHeader from "./AutorizadosHeader";
import Button from "./ButtonComponente";
import NavBackButton from "./NavBackButton";
import WelcomeLayout from "../layouts/WelcomeLayout";
import "./TextInput.css";
import "./EncuestasDisponibles.css";
import "./EncuestaLogrosLayout.css";
import "./EncuestaLogrosWKP.css";

import fondo2 from "../assets/fondo2.svg";

import { alertError, alertSuccess, alertWarning } from "../lib/alerts/appAlert";
import { formatApiDetail } from "../lib/formatApiDetail";
import { sweetLoading, sweetClose } from "../components/SweetAlert";

import {
  TIPOS_DOCUMENTO,
  LIMITACION_MOVERSE,
  ACTIVIDADES_AFECTADAS,
  PROBLEMAS,
  OBJETIVOS,
  ULTIMA_VEZ_OPTIONS,
  QUE_IMPIDE_OPTIONS,
  INITIAL_FORM,
} from "../data/encuestaLogrosCatalog";

import { ENUNCIADOS_OBJETIVOS } from "../data/encuestaLogrosEnunciados";
import { validateEncuestaLogros } from "../components/forms/validate";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function createInitialForm() {
  return JSON.parse(JSON.stringify(INITIAL_FORM));
}

function TextField({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
  error,
  disabled,
  maxLength,
  onFocus,
  onBlur,
  hint,
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
        onFocus={onFocus}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`field__input ${error ? "field__input--error" : ""}`}
        aria-describedby={
          hint ? `${name}-hint` : undefined
        }
      />

      {hint ? (
        <p
          id={`${name}-hint`}
          className="encuesta-logros-hint"
          role="status"
          aria-live="polite"
        >
          {hint}
        </p>
      ) : null}

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

function CheckboxGroup({ label, options, values, onToggle, error, note }) {
  return (
    <div className="field">
      {label ? <p className="field__label">{label}</p> : null}

      {note ? (
        <p
          style={{
            marginBottom: "0.5rem",
            opacity: 0.85,
            color: "#2c70cc",
            fontSize: "1rem",
          }}
        >
          {note}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 5, marginTop: 0 }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{ display: "flex", gap: 5, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={values.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required,
  error,
}) {
  return (
    <div className="field">
      {label ? (
        <p className="field__label">
          {label} {required ? <span className="field__req">*</span> : null}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 2, marginTop: 5 }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{ display: "flex", gap: 2, alignItems: "center" }}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {error ? <p className="field__error">{error}</p> : null}
    </div>
  );
}

export default function EncuestaLogrosWKP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sede: sedeParam } = useParams();

  const usuarioHeader = location.state?.usuario || "Usuario";
  const encuestasCount = location.state?.encuestasRealizadas ?? 0;

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

  const [form, setForm] = useState(() => createInitialForm());
  const [errors, setErrors] = useState({});
  const [showNombresHint, setShowNombresHint] = useState(false);
  const nombrePacienteHintShownRef = useRef(false);
  const nombreHintTimeoutRef = useRef(null);

  const PACIENTE_NOMBRE_COMPLETO_HINT =
    "Por estándares de calidad de datos, se requiere el registro de nombres y apellidos completos del paciente (dos nombres y dos apellidos), cuando corresponda.";

  const clearNombreHintTimer = () => {
    if (nombreHintTimeoutRef.current != null) {
      clearTimeout(nombreHintTimeoutRef.current);
      nombreHintTimeoutRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (nombreHintTimeoutRef.current != null) {
        clearTimeout(nombreHintTimeoutRef.current);
        nombreHintTimeoutRef.current = null;
      }
    },
    [],
  );

  const onNombresFocus = () => {
    if (nombrePacienteHintShownRef.current) return;
    nombrePacienteHintShownRef.current = true;
    setShowNombresHint(true);
    clearNombreHintTimer();
    nombreHintTimeoutRef.current = window.setTimeout(() => {
      setShowNombresHint(false);
      nombreHintTimeoutRef.current = null;
    }, 8000);
  };

  const onNombresBlur = () => {
    nombrePacienteHintShownRef.current = false;
    clearNombreHintTimer();
    setShowNombresHint(false);
  };

  const problemasSeleccionados = form.problemasTop;

  const objetivosAResponder = useMemo(
    () => problemasSeleccionados.filter((p) => p !== "otro"),
    [problemasSeleccionados],
  );

  const showQ24Q25 = form.adicionalNoPuede.trim().length > 0;

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onChange = (e) => {
    setValue(e.target.name, e.target.value);
  };

  const onDocumentoChange = (e) => {
    const raw = e.target.value;
    setForm((prev) => {
      const tipo = prev.tipoDocumento;
      if (tipo === "registro_civil" || tipo === "pasaporte") {
        const cleaned = raw.replace(/[^A-Za-z0-9\-]/g, "").slice(0, 30);
        return { ...prev, documento: cleaned };
      }
      const onlyDigits = raw.replace(/\D/g, "").slice(0, 11);
      return { ...prev, documento: onlyDigits };
    });
  };

  const onTipoDocumentoChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      tipoDocumento: value,
      documento: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.documento;
      return next;
    });
  };

  const toggleArrayValue = (field, value) => {
    setForm((prev) => {
      const arr = prev[field];
      const exists = arr.includes(value);
      const next = exists ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
  };

  const toggleActividades = (value) =>
    toggleArrayValue("actividadesAfectadas", value);

  const toggleQueImpide = (value) => toggleArrayValue("queImpide", value);

  const toggleProblemaTop = (value) => {
    setForm((prev) => {
      const arr = prev.problemasTop;
      const exists = arr.includes(value);

      if (exists) {
        const next = arr.filter((x) => x !== value);

        return {
          ...prev,
          problemasTop: next,
          ...(value === "otro" ? { otroProblema: "" } : {}),
        };
      }

      if (arr.length >= 3) return prev;

      return {
        ...prev,
        problemasTop: [...arr, value],
      };
    });
  };

  const setObjetivo = (problema, value) => {
    setForm((prev) => ({
      ...prev,
      objetivos: {
        ...prev.objetivos,
        [problema]: value,
      },
    }));
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setErrors({});
  };

  const validate = () => {
    const nextErrors = validateEncuestaLogros(form, objetivosAResponder);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    console.log("[ENCUESTA] Botón Enviar → onSubmit (preventDefault aplicado)");

    if (!validate()) {
      await alertWarning({
        title: "Campos incompletos",
        text: "Revisa los campos obligatorios antes de enviar.",
      });
      return;
    }

    sweetLoading({
      title: "Validando...",
      text: "Verificando si ya existe una encuesta para este documento.",
    });

    try {
      const tipoQ = encodeURIComponent(form.tipoDocumento || "cedula");
      const check = await fetch(
        `${API_URL}/encuestas/exists/${encodeURIComponent(form.documento)}?tipo_documento=${tipoQ}`,
      );

      const checkJson = await check.json().catch(() => ({}));

      if (!check.ok) {
        sweetClose();
        const detalle = formatApiDetail(checkJson?.detail);
        await alertError({
          title: "No se pudo validar el documento",
          text:
            detalle ||
            "No fue posible consultar si ya existe una encuesta para este documento. Revisa la conexión e intenta de nuevo.",
        });
        return;
      }

      if (checkJson?.exists === true) {
        sweetClose();
        await alertWarning({
          title: "Encuesta ya existe",
          text: "Esta persona ya tiene una encuesta registrada. No es posible realizar otra encuesta.",
        });
        return;
      }

      sweetClose();
    } catch {
      sweetClose();
      await alertError({
        title: "Error validando",
        text: "No fue posible comunicarse con el servidor para validar la encuesta.",
      });
      return;
    }

    if (!encuestadorCache) {
      await alertWarning({
        title: "Falta cédula del encuestador",
        text: "No se encontró la cédula del encuestador. Vuelve a iniciar sesión.",
      });
      return;
    }

    const cedulaEncuestador = String(encuestadorCache).trim();

    const payload = {
      encuestador: cedulaEncuestador,
      sede: sedeFormulario,
      nombres: form.nombres,
      apellidos: form.apellidos,
      tipoDocumento: form.tipoDocumento,
      documento: form.documento,
      limitacionMoverse: form.limitacionMoverse,
      actividadesAfectadas: form.actividadesAfectadas,
      sintomasTop: form.problemasTop,
      otroSintoma: form.otroProblema,
      objetivos: form.objetivos,
      textos: form.textos || {},
      objetivoExtra: form.objetivoExtra || null,
      adicionalNoPuede: form.adicionalNoPuede || null,
      ultimaVez: form.ultimaVez || null,
      queImpide: form.queImpide,
    };

    console.log("[ENCUESTA] Payload a enviar:", payload);
    console.log("[ENCUESTA] Iniciando request...");

    sweetLoading({
      title: "Enviando encuesta...",
      text: "Guardando información...",
    });

    try {
      const res = await fetch(`${API_URL}/encuestas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const postJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        sweetClose();
        const serverMsg = formatApiDetail(postJson?.detail);
        if (import.meta.env.DEV) {
          console.error("[encuesta logros1] POST /encuestas/ falló", {
            status: res.status,
            body: postJson,
          });
        }
        const title =
          res.status === 409
            ? "Esta persona ya tiene encuesta"
            : res.status === 422
              ? "Datos del formulario no válidos"
              : res.status === 400 || res.status === 500
                ? "No se pudo guardar en base de datos"
                : "No se pudo guardar la encuesta";
        await alertError({
          title,
          text:
            serverMsg ||
            `El servidor respondió con código ${res.status}. Intenta de nuevo o contacta soporte si persiste.`,
        });
        return;
      }

      if (postJson?.ok !== true) {
        sweetClose();
        await alertError({
          title: "Respuesta inesperada del servidor",
          text: "No se confirmó el guardado de la encuesta. No se actualizará el contador; revisa con soporte.",
        });
        return;
      }

      const res2 = await fetch(`${API_URL}/autorizados/incrementar-encuesta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedulaEncuestador,
          incremento: 1,
        }),
      });

      const incJson = await res2.json().catch(() => ({}));
      sweetClose();

      if (!res2.ok) {
        const incMsg = formatApiDetail(incJson?.detail);
        if (import.meta.env.DEV) {
          console.warn("[encuesta logros1] encuesta guardada; falló incrementar contador", {
            status: res2.status,
            body: incJson,
          });
        }
        await alertWarning({
          title: "Encuesta guardada en base de datos",
          text: incMsg
            ? `Los datos del paciente ya quedaron registrados. No se pudo actualizar tu contador de encuestas: ${incMsg}`
            : "Los datos del paciente ya quedaron registrados, pero no se pudo actualizar el contador del profesional en autorizados.",
        });
        resetForm();
        return;
      }

      await alertSuccess({
        title: "Encuesta registrada",
        text: "Los datos se guardaron en la base de datos y se actualizó tu contador de encuestas.",
      });

      resetForm();
    } catch (err) {
      sweetClose();
      if (import.meta.env.DEV) {
        console.error("[encuesta logros1] error de red o excepción", err);
      }
      await alertError({
        title: "Error de conexión",
        text: "No fue posible completar el envío. Verifica que el backend esté activo y tu red.",
      });
    }
  };

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

  const irAEncuestas = () => {
    navigate(encuestasListPath, { state: encuestasListState });
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
              <form onSubmit={onSubmit}>
                <h2 className="encuesta-logros-title">
                  Encuesta de Logros por Objetivos Wakeup
                </h2>

                <p className="encuesta-logros-sub">
                  Complete la información y seleccione sus principales
                  limitaciones para proponer objetivos de rehabilitación.
                </p>

                <h3 className="encuesta-logros-seccion">
                  Sección 1: Identificación
                </h3>

        <TextField
          label="1. Nombres completos"
          name="nombres"
          value={form.nombres}
          onChange={onChange}
          onFocus={onNombresFocus}
          onBlur={onNombresBlur}
          hint={showNombresHint ? PACIENTE_NOMBRE_COMPLETO_HINT : undefined}
          required
          error={errors.nombres}
          placeholder="Ej: María Fernanda"
        />

        <TextField
          label="2. Apellidos completos"
          name="apellidos"
          value={form.apellidos}
          onChange={onChange}
          required
          error={errors.apellidos}
          placeholder="Ej: Saavedra Grimaldo"
        />

        <SelectInput
          label="3. Selecciona el tipo de documento"
          name="tipoDocumento"
          value={form.tipoDocumento}
          onChange={onTipoDocumentoChange}
          options={TIPOS_DOCUMENTO}
          required
          error={errors.tipoDocumento}
        />

        <TextField
          label="4. Digite documento de identidad"
          name="documento"
          value={form.documento}
          onChange={onDocumentoChange}
          required
          error={errors.documento}
          placeholder={
            form.tipoDocumento === "registro_civil" ||
            form.tipoDocumento === "pasaporte"
              ? "Letras, números o guion (5 a 30 caracteres)"
              : "Solo números (6 a 11: cédula, tarjeta de identidad, CE)"
          }
          maxLength={
            form.tipoDocumento === "registro_civil" ||
            form.tipoDocumento === "pasaporte"
              ? 30
              : 11
          }
        />

                <h3 className="encuesta-logros-seccion">
                  Sección 2: Estado y limitación
                </h3>

        <RadioGroup
          label="5. ¿Qué tan limitada está su vida para moverse?"
          name="limitacionMoverse"
          options={LIMITACION_MOVERSE}
          value={form.limitacionMoverse}
          onChange={onChange}
          required
          error={errors.limitacionMoverse}
        />

        <CheckboxGroup
          label="6. ¿Qué actividades de la vida diaria se ven afectadas por su limitación?"
          options={ACTIVIDADES_AFECTADAS}
          values={form.actividadesAfectadas}
          onToggle={toggleActividades}
          note="(Puede elegir todas las que apliquen)"
        />

        <CheckboxGroup
          label="7. Elija los 3 problemas más importantes que se derivan de su condición"
          options={PROBLEMAS}
          values={form.problemasTop}
          onToggle={toggleProblemaTop}
          error={errors.problemasTop}
          note="(Seleccione mínimo 1 y máximo 3)"
        />

        {form.problemasTop.includes("otro") && (
          <TextField
            label="8. Si seleccionó “Otro”, diga cuál y sea específico"
            name="otroProblema"
            value={form.otroProblema}
            onChange={onChange}
            required
            error={errors.otroProblema}
            placeholder="Escriba el otro problema"
          />
        )}

                <h3 className="encuesta-logros-seccion">Sección 3: Objetivos</h3>

        {objetivosAResponder.length === 0 ? (
          <p className="encuesta-logros-textos" style={{ opacity: 0.85 }}>
            Seleccione al menos un problema para habilitar esta sección.
          </p>
        ) : (
          objetivosAResponder.map((problema) => {
            const meta = OBJETIVOS[problema];
            const enunciado = ENUNCIADOS_OBJETIVOS[problema];

            if (!meta) return null;

            return (
              <div className="objetivo-card" key={problema}>
                <p className="objetivo-card__title">
                  {enunciado || "Seleccione un objetivo específico:"}
                </p>

                <div className="objetivo-card__content">
                  <SelectInput
                    label="Objetivo específico"
                    name={`obj_${problema}`}
                    value={form.objetivos[problema] || ""}
                    onChange={(e) => setObjetivo(problema, e.target.value)}
                    options={meta.opciones}
                    required
                    error={errors[`obj_${problema}`]}
                  />
                </div>
              </div>
            );
          })
        )}

                <h3 className="encuesta-logros-seccion">
                  Sección 4: Preguntas finales
                </h3>

        <TextField
          label="Si su problema o síntoma no estaba en la lista y marcó otro, agregue el objetivo o meta que quiere conseguir"
          name="objetivoExtra"
          value={form.objetivoExtra}
          onChange={onChange}
          placeholder="Escriba el objetivo adicional (opcional)"
        />

        <TextField
          label="¿Hay algo adicional que ahora no puede hacer, pero que le gustaría volverlo a intentar?"
          name="adicionalNoPuede"
          value={form.adicionalNoPuede}
          onChange={(e) => {
            const value = e.target.value;

            setForm((prev) => ({
              ...prev,
              adicionalNoPuede: value,
              ...(value.trim().length === 0
                ? { ultimaVez: "", queImpide: [] }
                : {}),
            }));

            if (value.trim().length === 0) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.ultimaVez;
                delete next.queImpide;
                return next;
              });
            }
          }}
          placeholder="Escriba aquí (opcional)"
        />

        {showQ24Q25 && (
          <>
            <RadioGroup
              label="¿Cuándo fue la última vez que lo hizo?"
              name="ultimaVez"
              options={ULTIMA_VEZ_OPTIONS}
              value={form.ultimaVez}
              onChange={onChange}
              required
              error={errors.ultimaVez}
            />

            <CheckboxGroup
              label="¿Qué le impide hacerlo?"
              options={QUE_IMPIDE_OPTIONS}
              values={form.queImpide}
              onToggle={toggleQueImpide}
              error={errors.queImpide}
              note="(Seleccione al menos una opción)"
            />
          </>
        )}

                <div className="encuesta-logros-actions">
                  <Button type="submit" variant="emphasis">
                    Enviar
                  </Button>
                  <Button type="button" variant="normal" onClick={resetForm}>
                    Limpiar
                  </Button>
                  <NavBackButton
                    variant="icon-text"
                    to={encuestasListPath}
                    state={encuestasListState}
                    ariaLabel="Volver a encuestas disponibles"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
