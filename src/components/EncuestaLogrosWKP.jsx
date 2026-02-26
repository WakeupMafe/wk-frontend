import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SelectInput from "./SelectInput";
import "./TextInput.css";
import "./EncuestaLogrosWKP.css";
import { sweetAlert, sweetLoading, sweetClose } from "../components/SweetAlert";
import { pedirCedulaFisio } from "../components/SweetCedulaPrompt";

// Opciones
const TIPOS_DOCUMENTO = [
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cedula", label: "Cédula" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
];

const LIMITACION_MOVERSE = [
  { value: "mucho", label: "Mucho" },
  { value: "bastante", label: "Bastante" },
  { value: "poco", label: "Poco" },
  { value: "nada", label: "Nada" },
];

const ACTIVIDADES_AFECTADAS = [
  { value: "tareas_hogar", label: "Tareas del hogar" },
  {
    value: "autocuidado",
    label: "Autocuidado (bañarse - vestirse - alimentarse)",
  },
  { value: "laborales", label: "Laborales" },
  { value: "vida_social", label: "Vida social o familiar" },
  { value: "ocio", label: "Ocio" },
  { value: "ejercicio", label: "Ejercicio/deporte" },
];

// Lista de “problemas”
const PROBLEMAS = [
  { value: "dolor", label: "Dolor" },
  {
    value: "intolerancia_postura",
    label:
      "Intolerancia para mantener una posición por el tiempo deseado o necesario (Sentado - o de pie)",
  },
  {
    value: "limitacion_deporte",
    label: "Limitación para hacer ejercicio físico o deporte",
  },
  {
    value: "trastorno_trabajo",
    label:
      "Trastorno para mantener el ritmo de trabajo o trabajar (Tiene que parar con frecuencia)",
  },
  { value: "vida_social", label: "Restricción para hacer vida social" },
  { value: "recrearse", label: "Dificultad para recrearse" },
  { value: "dormir", label: "Trastorno para dormir" },
  { value: "escaleras", label: "Dificultad subir o bajar escaleras" },
  {
    value: "levantarse_silla_cama",
    label: "Dificultad para levantarse de la cama o pararse de una silla",
  },
  { value: "autocuidado", label: "Limitación para el autocuidado" },
  {
    value: "caminar_vehiculo",
    label:
      "Dificultad para caminar, acomodarse en un carro o montarse en un vehículo",
  },
  {
    value: "recoger_objetos",
    label: "Limitación para adoptar la postura para recoger objetos",
  },
  {
    value: "cargar_paquetes",
    label: "Dificultad para cargar paquetes u objetos de diferentes pesos",
  },
  {
    value: "conducir",
    label:
      "Restricción para conducir carro o moto sea por cortos o largos periodos de tiempo.",
  },
  { value: "otro", label: "Otro" },
];

// Objetivos por problema
const OBJETIVOS = {
  dolor: {
    objetivoGeneral: "Objetivo General : Disminuir el dolor ",
    opciones: [
      { value: "dolor_disminuya", label: "Que el dolor disminuya" },
      {
        value: "dolor_leve",
        label: "Que el dolor disminuya y pase a ser leve/tolerable",
      },
      {
        value: "dolor_desaparece_mayor_parte",
        label: "Que el dolor desaparezca la mayor parte del tiempo",
      },
      { value: "dolor_desaparece", label: "Que el dolor desaparezca" },
    ],
  },

  intolerancia_postura: {
    objetivoGeneral:
      "Lograr mantener una postura (Sentado, Acostado, de Pie) en un tiempo específico",
    opciones: [
      { value: "5min", label: "Lograr mantener la postura por 5 minutos" },
      { value: "10min", label: "Lograr mantener la postura por 10 minutos" },
      { value: "15min", label: "Lograr mantener la postura por 15 minutos" },
      { value: "30min", label: "Lograr mantener la postura por 30 minutos" },
      { value: "60min", label: "Lograr mantener la postura por 1 hora o más" },
    ],
  },

  limitacion_deporte: {
    objetivoGeneral: "Objetivo General : Poder hacer ejercicio o deporte ",
    opciones: [
      {
        value: "leve",
        label: "Poder hacer ejercicio de leve intensidad (escala de Borg 3/10)",
      },
      {
        value: "moderada",
        label:
          "Poder hacer ejercicio de moderada intensidad (escala de Borg 6/10)",
      },
      {
        value: "deporte_preferencia",
        label:
          "Poder practicar el deporte de mi preferencia (trote - pádel - tenis - fútbol - pilates)",
      },
    ],
  },

  trastorno_trabajo: {
    objetivoGeneral:
      "Trabajar en un periodo de tiempo específico sin incomodidad (Objetivo general)",
    opciones: [
      { value: "15min", label: "Poder trabajar por 15 minutos" },
      { value: "30min", label: "Poder trabajar por 30 minutos" },
      { value: "1a3h", label: "Poder trabajar de 1 a 3 horas" },
      {
        value: "7h",
        label: "Poder trabajar una jornada de 7 horas sin limitación",
      },
    ],
  },

  vida_social: {
    objetivoGeneral: "Objetivo General : Tener una vida social normal ",
    opciones: [
      {
        value: "cumple_familia",
        label:
          "Poder asistir a cumpleaños o actividades familiares de leve exigencia física",
      },
      {
        value: "misa_1h",
        label:
          "Poder ir a misa o reuniones religiosas de 1 hora o más de duración",
      },
      {
        value: "eventos_2h",
        label:
          "Poder ir a cine, partidos, conciertos (2+ horas) y con alta demanda física",
      },
    ],
  },

  recrearse: {
    objetivoGeneral:
      "Objetivo General : Poder realizar actividades recreativas ",
    opciones: [
      { value: "10_15", label: "Poder por 10 - 15 minutos" },
      { value: "20_30", label: "Poder por 20 - 30 minutos" },
      { value: "45_60", label: "Poder por 45 minutos a 1 hora" },
      { value: "sin_restriccion", label: "Poder sin restricciones" },
    ],
  },

  dormir: {
    objetivoGeneral: " Objetivo General : Poder dormir",
    opciones: [
      { value: "conciliar", label: "Quedarme dormido (conciliar el sueño)" },
      { value: "2a4", label: "Dormir de 2 a 4 horas sin molestia" },
      { value: "5a8", label: "Dormir de 5 a 8 horas sin molestia" },
      { value: "sin_dificultad", label: "Dormir sin dificultad" },
    ],
  },

  escaleras: {
    objetivoGeneral: "Objetivo General : Poder subir o bajar escaleras",
    opciones: [
      {
        value: "lado_despacio",
        label:
          "Subir/bajar agarrado de baranda o con ayuda, de lado y despacio",
      },
      {
        value: "simetrico",
        label:
          "Subir/bajar agarrado de baranda, con ayuda, de frente, un pie alcanzando al otro (simétrico)",
      },
      {
        value: "asimetrico",
        label:
          "Subir/bajar agarrado de baranda o pared, de frente y sin alcanzar el otro pie (asimétrico)",
      },
      {
        value: "sin_dificultad",
        label: "Poder bajar y subir escaleras sin dificultad",
      },
    ],
  },

  levantarse_silla_cama: {
    objetivoGeneral: "Objetivo General : Pararme sin dificultad ",
    opciones: [
      { value: "con_ayuda", label: "Poder pararme con ayuda de alguien más" },
      {
        value: "dispositivo",
        label:
          "Poder pararme solo pero con ayuda de un dispositivo (muletas - caminador)",
      },
      {
        value: "leve_limitacion",
        label:
          "Poder pararme sin ayuda de alguien y sin dispositivo con leve limitación",
      },
      { value: "sin_dificultad", label: "Poder pararme sin dificultad" },
    ],
  },

  autocuidado: {
    objetivoGeneral: "Objetivo General: Realizar con facilidad mi autocuidado ",
    opciones: [
      { value: "con_ayuda", label: "Poder bañarme y vestirme con ayuda" },
      {
        value: "algo_ayuda",
        label: "Poder bañarme y vestirme con algo de ayuda",
      },
      {
        value: "zapatos_medias",
        label:
          "Poder bañarme y vestirme, pero aún con ayuda para amarrarme los zapatos o ponerme las medias",
      },
      {
        value: "independencia_total",
        label: "Poder bañarme y vestirme con independencia total",
      },
    ],
    requiereTexto: true,
    textoLabel:
      "Si es otra actividad diferente a bañarse o vestirse, escriba cuál y un objetivo alcanzable en el corto plazo",
    textoPlaceholder: "Ej: peinarme solo / preparar una comida sencilla / etc.",
    textoOpcional: true,
  },

  caminar_vehiculo: {
    objetivoGeneral:
      "Objetivo General : Poder caminar, tomar el transporte y otras actividades de la vida diaria ",
    opciones: [
      { value: "pasos_cortos", label: "Poder dar algunos pasos cortos" },
      {
        value: "dolor_soportable",
        label:
          "Poder caminar algunos pasos con dolor y acomodarme en el carro con una molestia soportable",
      },
      {
        value: "molestias_leves",
        label:
          "Poder caminar algunos pasos con molestia y acomodarme en el carro con molestias leves",
      },
      {
        value: "sin_molestias_viaje_corto",
        label:
          "Poder caminar unos pasos sin dolor, acomodarme en el carro y tener un viaje corto sin molestias",
      },
      {
        value: "actividad_fisica",
        label: "Poder caminar como actividad física",
      },
      {
        value: "aumentar_tiempo_distancia",
        label: "Poder aumentando el tiempo y la distancia",
      },
      {
        value: "aumentar_velocidad",
        label: "Poder caminar aumentado la velocidad",
      },
    ],
  },

  recoger_objetos: {
    objetivoGeneral: "Objetivo General : Poder recoger objetos del piso ",
    opciones: [
      {
        value: "postura_modificada_dolor_leve",
        label:
          "Recoger objetos asumiendo postura modificada e incómoda con leve dolor",
      },
      {
        value: "postura_modificada_sin_dolor",
        label:
          "Recoger objetos con postura modificada, algo incómoda pero sin dolor",
      },
      {
        value: "postura_correcta_molestia",
        label:
          "Recoger objetos asumiendo la postura correcta pero con algo de molestia",
      },
      {
        value: "varias_maneras_sin_dolor",
        label: "Recoger objetos del piso de varias maneras y sin dolor",
      },
    ],
  },

  cargar_paquetes: {
    objetivoGeneral:
      "Objetivo General : Cargar paquetes de diferentes tamaños ",
    opciones: [
      { value: "pequenos", label: "Cargar paquetes pequeños" },
      { value: "medianos", label: "Cargar paquetes medianos" },
      { value: "cualquier", label: "Cargar paquetes de cualquier tamaño" },
    ],
  },

  conducir: {
    objetivoGeneral: "Objetivo General: Poder manejar carro o moto ",
    opciones: [
      {
        value: "30min",
        label: "Manejar carro o moto en trayectos de 30 minutos",
      },
      {
        value: "40min",
        label: "Manejar carro o moto sin molestia por 40 minutos",
      },
      { value: "1h", label: "Manejar carro o moto sin molestia por 1 hora" },
      {
        value: "2h_mas",
        label: "Manejar carro o moto sin molestia por 2 horas o más",
      },
    ],
  },
};

function TextField({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
  error,
  disabled,
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
        disabled={disabled}
        placeholder={placeholder}
        className={`field__input ${error ? "field__input--error" : ""}`}
      />

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

  // ✅ sede: primero intenta state, si no hay, toma cache
  const sedeCache =
    location.state?.sede ||
    (() => {
      try {
        const cached = sessionStorage.getItem("wk_autorizado");
        const c = cached ? JSON.parse(cached) : null;
        return c?.sede || "Sin sede";
      } catch {
        return "Sin sede";
      }
    })();
  // ✅ cédula del encuestador: primero intenta state, si no hay, toma cache
  const encuestadorCache =
    location.state?.cedula ||
    (() => {
      try {
        const cached = sessionStorage.getItem("wk_autorizado");
        const c = cached ? JSON.parse(cached) : null;
        return c?.cedula || ""; // si no hay, deja vacío
      } catch {
        return "";
      }
    })();
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    tipoDocumento: "",
    documento: "",

    limitacionMoverse: "",
    actividadesAfectadas: [],
    problemasTop: [],
    otroProblema: "",

    objetivos: {},
    textos: {},

    objetivoExtra: "",
    adicionalNoPuede: "",
    ultimaVez: "",
    queImpide: [],
  });

  const [errors, setErrors] = useState({});

  const problemasSeleccionados = form.problemasTop;

  const objetivosAResponder = useMemo(() => {
    return problemasSeleccionados.filter((p) => p !== "otro");
  }, [problemasSeleccionados]);

  const setValue = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const onChange = (e) => setValue(e.target.name, e.target.value);

  const onDocumentoChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, documento: onlyDigits }));
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
        const cleaned =
          value === "otro"
            ? { ...prev, problemasTop: next, otroProblema: "" }
            : { ...prev, problemasTop: next };
        return cleaned;
      }

      if (arr.length >= 3) return prev;

      return { ...prev, problemasTop: [...arr, value] };
    });
  };

  const setObjetivo = (problema, value) => {
    setForm((prev) => ({
      ...prev,
      objetivos: { ...prev.objetivos, [problema]: value },
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.nombres.trim()) nextErrors.nombres = "Campo requerido.";
    if (!form.apellidos.trim()) nextErrors.apellidos = "Campo requerido.";

    if (!form.tipoDocumento)
      nextErrors.tipoDocumento = "Seleccione un tipo de documento.";

    if (!form.documento) nextErrors.documento = "Digite el documento.";
    if (form.documento) {
      if (form.documento.length < 6)
        nextErrors.documento = "Debe tener mínimo 6 dígitos.";
      if (form.documento.length > 10)
        nextErrors.documento = "Debe tener máximo 10 dígitos.";
    }

    if (!form.limitacionMoverse)
      nextErrors.limitacionMoverse = "Seleccione una opción.";

    if (form.problemasTop.length < 1)
      nextErrors.problemasTop = "Debe seleccionar mínimo 1 problema.";
    if (form.problemasTop.length > 3)
      nextErrors.problemasTop = "Máximo 3 problemas.";

    if (form.problemasTop.includes("otro") && !form.otroProblema.trim()) {
      nextErrors.otroProblema = "Especifique el otro problema.";
    }

    for (const p of objetivosAResponder) {
      if (!form.objetivos[p])
        nextErrors[`obj_${p}`] = "Seleccione un objetivo.";
    }

    if (form.adicionalNoPuede.trim()) {
      if (!form.ultimaVez) nextErrors.ultimaVez = "Seleccione una opción.";
      if (form.queImpide.length < 1)
        nextErrors.queImpide = "Seleccione al menos una opción.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      await sweetAlert({
        icon: "warning",
        title: "Campos incompletos",
        text: "Revisa los campos obligatorios antes de enviar.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // ✅ 0) VALIDAR SI YA EXISTE ENCUESTA PARA ESTE DOCUMENTO (cédula del paciente)
    sweetLoading({
      title: "Validando...",
      text: "Verificando si ya existe una encuesta para este documento.",
    });

    try {
      const check = await fetch(
        `http://localhost:8000/encuestas/exists/${encodeURIComponent(
          form.documento,
        )}`,
      );

      const checkJson = await check.json().catch(() => ({}));

      // si endpoint falla, no seguimos (para evitar duplicados)
      if (!check.ok) {
        sweetClose();
        await sweetAlert({
          icon: "error",
          title: "No se pudo validar",
          text: "No fue posible validar si la encuesta ya existe. Intenta nuevamente.",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      if (checkJson?.exists === true) {
        sweetClose();
        await sweetAlert({
          icon: "warning",
          title: "Encuesta ya existe",
          text: "Esta persona ya tiene una encuesta registrada. No es posible realizar otra encuesta.",
          confirmButtonText: "Entendido",
        });
        return;
      }

      sweetClose();
    } catch (err) {
      sweetClose();
      await sweetAlert({
        icon: "error",
        title: "Error validando",
        text: "No fue posible comunicarse con el servidor para validar la encuesta.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // 1) Pedir cédula del fisio (solo si NO existe encuesta)

    if (!encuestadorCache) {
      await sweetAlert({
        icon: "warning",
        title: "Falta cédula del encuestador",
        text: "No se encontró la cédula del encuestador. Vuelve a iniciar sesión.",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // 2) Construir payload
    const payload = {
      encuestador: String(encuestadorCache), // ✅ cédula del encuestador (string)
      sede: sedeCache, // ✅ sede desde state/cache

      nombres: form.nombres,
      apellidos: form.apellidos,
      tipoDocumento: form.tipoDocumento,
      documento: form.documento,

      limitacionMoverse: form.limitacionMoverse,
      actividadesAfectadas: form.actividadesAfectadas,

      sintomasTop: form.problemasTop,
      otroSintoma: form.otroProblema,

      objetivos: form.objetivos,
      textos: form.textos || {}, // ✅ recomendado para que el backend no reciba undefined

      objetivoExtra: form.objetivoExtra || null,
      adicionalNoPuede: form.adicionalNoPuede || null,
      ultimaVez: form.ultimaVez || null,
      queImpide: form.queImpide,
    };
    sweetLoading({
      title: "Enviando encuesta...",
      text: "Guardando información...",
    });

    try {
      // 3) Guardar encuesta
      const res = await fetch("http://localhost:8000/encuestas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        sweetClose();

        // ✅ si el backend ya responde algo tipo "duplicado", lo puedes mostrar aquí
        await sweetAlert({
          icon: "error",
          title: "Error ❌",
          text: "No se pudo guardar la encuesta. Intenta nuevamente.",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      // 4) Incrementar contador en autorizados
      const res2 = await fetch(
        "http://localhost:8000/autorizados/incrementar-encuesta",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cedula: String(encuestadorCache),
            incremento: 1,
          }),
        },
      );

      const data2 = await res2.json().catch(() => ({}));

      sweetClose();

      if (!res2.ok) {
        await sweetAlert({
          icon: "warning",
          title: "Encuesta guardada ✅",
          text: "Pero no se pudo actualizar el contador del fisioterapeuta. Verifica la cédula o inténtalo de nuevo.",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      await sweetAlert({
        icon: "success",
        title: "¡Listo!",
        text: "Encuesta enviada y registro actualizado correctamente.",
        confirmButtonText: "Aceptar",
      });
    } catch (err) {
      sweetClose();
      await sweetAlert({
        icon: "error",
        title: "Error de conexión ❌",
        text: "No fue posible comunicarse con el servidor. Verifica que el backend esté activo.",
        confirmButtonText: "Aceptar",
      });
    }
  };

  const showQ24Q25 = form.adicionalNoPuede.trim().length > 0;

  return (
    <div className="ContentEncuesta">
      <form onSubmit={onSubmit} style={{ Width: "100%", margin: "0 auto" }}>
        <h2 className="TituloEncuesta" style={{ marginBottom: 8 }}>
          Encuesta de Logros por Objetivos Wakeup
        </h2>
        <p className="textos" style={{ marginTop: 0, opacity: 0.8 }}>
          Complete la información y seleccione sus principales limitaciones para
          proponer objetivos de rehabilitación.
        </p>

        <h3 className="Secciones">Sección 1: Identificación</h3>

        <TextField
          label="1. Nombres completos"
          name="nombres"
          value={form.nombres}
          onChange={onChange}
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
          onChange={onChange}
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
          placeholder="Solo números (6 a 10 dígitos)"
        />

        <h3 className="Secciones"> Sección 1: Estado y Limitación</h3>

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

        {form.problemasTop.includes("otro") ? (
          <TextField
            label="8. Si seleccionó “Otro”, diga cuál y sea específico"
            name="otroProblema"
            value={form.otroProblema}
            onChange={onChange}
            required
            error={errors.otroProblema}
            placeholder="Escriba el otro problema"
          />
        ) : null}

        <h3 className="Secciones">Sección 2: Seguimiento y Objetivos</h3>

        {objetivosAResponder.length === 0 ? (
          <p className="textos" style={{ opacity: 0.8 }}>
            Seleccione al menos un problema para que se habilite esta sección.
          </p>
        ) : (
          objetivosAResponder.map((p) => {
            const meta = OBJETIVOS[p];
            if (!meta) return null;

            return (
              <div className="objetivos_especificos" key={p}>
                <p style={{ marginTop: 0, fontWeight: 600 }}>
                  {PROBLEMAS.find((x) => x.value === p)?.label}
                </p>

                <p style={{ marginTop: 0, opacity: 0.8 }}>
                  {meta.objetivoGeneral}
                </p>

                <SelectInput
                  label="Objetivo Especifico"
                  name={`obj_${p}`}
                  value={form.objetivos[p] || ""}
                  onChange={(e) => setObjetivo(p, e.target.value)}
                  options={meta.opciones}
                  required
                  error={errors[`obj_${p}`]}
                />
              </div>
            );
          })
        )}

        <h3>Preguntas finales</h3>

        <TextField
          label="Si su problema o síntoma no estaba en la lista y marcó otros, agregue el objetivo o meta que quiere conseguir"
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
            const v = e.target.value;
            setForm((prev) => ({
              ...prev,
              adicionalNoPuede: v,
              ...(v.trim().length === 0
                ? { ultimaVez: "", queImpide: [] }
                : {}),
            }));

            if (v.trim().length === 0) {
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

        {showQ24Q25 ? (
          <>
            <RadioGroup
              label="¿Cuándo fue la última vez que lo hizo?"
              name="ultimaVez"
              options={[
                { value: "1_2_meses", label: "1 a 2 meses" },
                { value: "3_6_meses", label: "3 a 6 meses" },
                { value: "7_12_meses", label: "7 a 12 meses" },
                { value: "mas_1_ano", label: "Más de 1 año" },
              ]}
              value={form.ultimaVez}
              onChange={onChange}
              required
              error={errors.ultimaVez}
            />

            <CheckboxGroup
              label="¿Qué le impide hacerlo?"
              options={[
                { value: "dolor", label: "Dolor" },
                { value: "miedo", label: "Miedo a moverse o lastimarse" },
                { value: "debilidad", label: "Debilidad" },
              ]}
              values={form.queImpide}
              onToggle={toggleQueImpide}
              error={errors.queImpide}
              note="(Seleccione al menos una opción)"
            />
          </>
        ) : null}

        <div className="contenedor-botones">
          <button className="botones" type="submit">
            Enviar
          </button>

          <button
            type="button"
            className="botones"
            onClick={() => {
              setForm({
                nombres: "",
                apellidos: "",
                tipoDocumento: "",
                documento: "",
                limitacionMoverse: "",
                actividadesAfectadas: [],
                problemasTop: [],
                otroProblema: "",
                objetivos: {},
                textos: {},
                objetivoExtra: "",
                adicionalNoPuede: "",
                ultimaVez: "",
                queImpide: [],
              });
              setErrors({});
            }}
          >
            Limpiar
          </button>

          <button
            type="button"
            className="botones"
            onClick={() => navigate("/autorizados-inicio")}
          >
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}
