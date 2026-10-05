export const TIPOS_DOCUMENTO = [
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cedula", label: "Cédula" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
  { value: "registro_civil", label: "Registro civil" },
];

export const LIMITACION_MOVERSE = [
  { value: "mucho", label: "Severamente" },
  { value: "bastante", label: "Bastante" },
  { value: "poco", label: "Poco" },
  { value: "nada", label: "Nada" },
];

/**
 * Zonas corporales (Logros 1). Se eligen 1–3 en orden de prioridad.
 * Almacenado en `wakeup_seguimientos.patologia_relacionada` como JSON:
 * `{"zonas":["rodilla","hombro"],"otro":"..."}` o un código legado suelto.
 * "funcional" se mantiene solo para lectura de registros antiguos.
 */
export const PATOLOGIA_RELACIONADA = [
  { value: "rodilla", label: "Rodilla" },
  { value: "hombro", label: "Hombro" },
  { value: "cadera", label: "Cadera" },
  { value: "lumbar", label: "Lumbar" },
  { value: "mano", label: "Mano" },
  { value: "codo", label: "Codo" },
  { value: "cuello", label: "Cuello" },
  { value: "pie", label: "Pie" },
  { value: "otro", label: "Otro" },
];

export const PATOLOGIA_RANK_LABELS = [
  "Prioritaria",
  "Secundaria",
  "Terciaria",
];

const PATOLOGIA_LABEL_BY_VALUE = Object.fromEntries([
  ...PATOLOGIA_RELACIONADA.map((o) => [o.value, o.label]),
  ["funcional", "Funcional"],
]);

/**
 * @param {unknown} raw
 * @returns {{ zonas: string[], otro: string }}
 */
export function parsePatologiaRelacionada(raw) {
  if (raw == null) return { zonas: [], otro: "" };
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const zonas = Array.isArray(raw.zonas)
      ? raw.zonas.map((z) => String(z).trim()).filter(Boolean).slice(0, 3)
      : [];
    return { zonas, otro: String(raw.otro ?? "").trim() };
  }
  const s = String(raw).trim();
  if (!s) return { zonas: [], otro: "" };
  if (s.startsWith("{")) {
    try {
      return parsePatologiaRelacionada(JSON.parse(s));
    } catch {
      /* fall through */
    }
  }
  if (s.includes(",")) {
    const zonas = s
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean)
      .slice(0, 3);
    return { zonas, otro: "" };
  }
  return { zonas: [s], otro: "" };
}

/**
 * Etiqueta legible para UI / PDF / Logros 2 (soporta legado y multi-zona).
 * @param {unknown} raw
 */
export function formatPatologiaLabel(raw) {
  const { zonas, otro } = parsePatologiaRelacionada(raw);
  if (!zonas.length) return "";
  return zonas
    .map((z, i) => {
      const base = PATOLOGIA_LABEL_BY_VALUE[z] || z;
      const rank = PATOLOGIA_RANK_LABELS[i] || `Zona ${i + 1}`;
      if (z === "otro" && otro) return `${base}: ${otro} (${rank})`;
      return `${base} (${rank})`;
    })
    .join("; ");
}

/**
 * Serializa para guardar en columna TEXT.
 * @param {string[]} zonas
 * @param {string} [otroTexto]
 */
export function serializePatologiaRelacionada(zonas, otroTexto = "") {
  const list = (Array.isArray(zonas) ? zonas : [])
    .map((z) => String(z).trim())
    .filter(Boolean)
    .slice(0, 3);
  const otro = String(otroTexto ?? "").trim();
  if (!list.length) return "";
  if (list.length === 1 && list[0] !== "otro") return list[0];
  return JSON.stringify({
    zonas: list,
    ...(list.includes("otro") && otro ? { otro } : {}),
  });
}

export const ACTIVIDADES_AFECTADAS = [
  { value: "tareas_hogar", label: "Tareas del hogar" },
  {
    value: "autocuidado",
    label: "Autocuidado (bañarse - vestirse - alimentarse)",
  },
  { value: "laborales", label: "Laborales" },
  { value: "vida_social", label: "Vida social o familiar" },
  { value: "ocio", label: "Ocio" },
  { value: "ejercicio", label: "Ejercicio/deporte" },
  { value: "ninguna", label: "Ninguna" },
];

export const PROBLEMAS = [
  { value: "dolor", label: "Sentir dolor es uno de mis problemas principales" },
  {
    value: "intolerancia_postura",
    label:
      "No poder mantenerme de pie por mucho tiempo es un problema importante",
  },
  {
    value: "intolerancia_sentado",
    label:
      "No poder estar sentado(a) es uno de mis principales problemas",
  },
  {
    value: "limitacion_deporte",
    label: "Limitación para hacer ejercicio físico o deporte",
  },
  {
    value: "trastorno_trabajo",
    label:
      "No puedo mantener el ritmo de trabajo que quisiera por la limitación",
  },
  {
    value: "vida_social",
    label:
      "Restricción para participar en actividades sociales, recreativas o de ocio.",
  },
  { value: "dormir", label: "No puedo dormir bien a raíz del dolor" },
  {
    value: "escaleras",
    label: "Tengo limitación para bajar y subir escaleras",
  },
  {
    value: "levantarse_silla_cama",
    label: "Dificultad para levantarse de la cama o pararse de una silla",
  },
  { value: "autocuidado", label: "Limitación para el autocuidado" },
  {
    value: "caminar_vehiculo",
    label: "Tengo dificultad para caminar",
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
      "Restricción para conducir carro o moto sea por cortos o largos períodos de tiempo.",
  },
  { value: "otro", label: "Otro" },
];

export const OBJETIVOS = {
  dolor: {
    objetivoGeneral: "Objetivo General: Disminuir el dolor",
    opciones: [
      { value: "dolor_disminuya", label: "Que el dolor disminuya (30%)" },
      {
        value: "dolor_leve",
        label: "Que el dolor pase a ser leve/tolerable (50%)",
      },
      {
        value: "dolor_desaparece_mayor_parte",
        label: "Que el dolor desaparezca la mayor parte del tiempo (70%)",
      },
      { value: "dolor_desaparece", label: "Que el dolor desaparezca" },
    ],
  },

  intolerancia_postura: {
    objetivoGeneral:
      "Objetivo General: Poder permanecer de pie por más tiempo",
    opciones: [
      {
        value: "pie_mas_tiempo",
        label:
          "Poder estar de pie un poco más de tiempo antes de necesitar cambiar",
        requiereMinutos: true,
      },
      {
        value: "pie_avd",
        label:
          "Poder estar de pie para cumplir todas las actividades de la vida diaria",
        requiereMinutos: true,
      },
      {
        value: "pie_sin_cambio_ocio",
        label:
          "Poder estar de pie sin cambiar de posición por molestia incluyendo actividades de ocio",
      },
    ],
  },

  intolerancia_sentado: {
    objetivoGeneral:
      "Objetivo General: Poder permanecer sentado por más tiempo",
    opciones: [
      {
        value: "sentado_mas_tiempo",
        label:
          "Poder estar sentado un poco más de tiempo antes de necesitar cambiar",
        requiereMinutos: true,
      },
      {
        value: "sentado_avd",
        label:
          "Poder estar sentado para cumplir todas las actividades de la vida diaria o laborales",
        requiereHoras: true,
      },
      {
        value: "sentado_sin_cambio_ocio",
        label:
          "Poder estar sentado sin cambiar de posición por molestia incluyendo actividades de ocio",
        requiereTextoObjetivo: true,
      },
    ],
  },

  limitacion_deporte: {
    objetivoGeneral: "Objetivo General: Poder hacer ejercicio o deporte",
    opciones: [
      {
        value: "ejercicio_suave",
        label:
          "Que pueda hacer ejercicio suave, con poco peso, cardiovascular de baja intensidad",
        requiereTextoObjetivo: true,
      },
      {
        value: "ejercicio_leve_sudor",
        label:
          "Que pueda hacer ejercicio de leve intensidad pero que me hace sudar y me agita un poco",
        requiereTextoObjetivo: true,
      },
      {
        value: "ejercicio_moderado_fc",
        label:
          "Que pueda hacer ejercicio moderado sintiendo el esfuerzo, que me hace sudar o me sube la frecuencia cardíaca, por encima del reposo",
      },
    ],
  },

  trastorno_trabajo: {
    objetivoGeneral:
      "Objetivo General: Trabajar por un periodo de tiempo específico sin incomodidad",
    opciones: [
      {
        value: "trabajo_mas_tiempo",
        label: "Que pueda trabajar un poco más de tiempo sin tener que parar",
        requiereMinutos: true,
      },
      {
        value: "trabajo_media_jornada",
        label:
          "Que pueda trabajar media jornada laboral sin limitación y con pausas cortas",
      },
      {
        value: "trabajo_jornada_completa",
        label: "Poder trabajar la jornada completa (7-8 horas) sin limitación",
      },
    ],
  },

  vida_social: {
    objetivoGeneral:
      "Objetivo General: Participar en actividades sociales, familiares, recreativas o de ocio",
    opciones: [
      {
        value: "social_leve",
        label:
          "Que pueda participar en actividades sociales y familiares cortas de leve exigencia",
      },
      {
        value: "social_moderada",
        label:
          "Que pueda asistir a actividades sociales y familiares de moderada exigencia (1 hora o más de duración)",
      },
      {
        value: "social_alta",
        label:
          "Que pueda asistir a actividades sociales y familiares de alta demanda física (2 horas o más de duración)",
      },
    ],
  },

  /**
   * Clave retirada del listado Q8 (fusionada en `vida_social`).
   * Se mantiene para lectura / seguimiento Logros 2 de registros antiguos.
   */
  recrearse: {
    objetivoGeneral: "Objetivo General: Poder realizar actividades recreativas",
    opciones: [
      { value: "10_15", label: "Poder por 10 a 15 minutos" },
      { value: "20_30", label: "Poder por 20 a 30 minutos" },
      { value: "45_60", label: "Poder por 45 minutos a 1 hora" },
      { value: "sin_restriccion", label: "Poder sin restricciones" },
    ],
  },

  dormir: {
    objetivoGeneral: "Objetivo General: Poder dormir",
    opciones: [
      { value: "conciliar", label: "Dificultad para conciliar el sueño" },
      {
        value: "cierta_cantidad",
        label:
          "Que pueda dormir cierta cantidad de tiempo sin cambiar de posición",
        requiereMinutos: true,
      },
      { value: "2a4", label: "Dormir de 2 a 4 horas sin molestia" },
      { value: "5a8", label: "Dormir de 5 a 8 horas sin molestia" },
    ],
  },

  escaleras: {
    objetivoGeneral: "Objetivo General: Poder subir o bajar escaleras",
    opciones: [
      {
        value: "lado_despacio",
        label:
          "Subir o bajar agarrado de baranda o con ayuda, de lado y despacio",
      },
      {
        value: "simetrico",
        label:
          "Subir o bajar agarrado de baranda, con ayuda, de frente, un pie alcanzando al otro",
      },
      {
        value: "asimetrico",
        label:
          "Subir o bajar agarrado de baranda o pared, de frente y sin alcanzar el otro pie",
      },
      {
        value: "sin_dificultad",
        label: "Poder subir y bajar escaleras sin dificultad",
      },
    ],
  },

  levantarse_silla_cama: {
    objetivoGeneral: "Objetivo General: Pararme sin dificultad",
    opciones: [
      { value: "con_ayuda", label: "Poder pararme con ayuda de alguien más" },
      {
        value: "dispositivo",
        label:
          "Poder pararme solo, pero con ayuda de un dispositivo (muletas o caminador)",
      },
      {
        value: "leve_limitacion",
        label: "Poder pararme sin ayuda ni dispositivo, con leve limitación",
      },
      { value: "sin_dificultad", label: "Poder pararme sin dificultad" },
    ],
  },

  autocuidado: {
    objetivoGeneral: "Objetivo General: Realizar con facilidad mi autocuidado",
    opciones: [
      {
        value: "con_ayuda",
        label:
          "Que pueda realizar mis actividades de autocuidado (bañarme, vestirme, alimentarme) con ayuda",
      },
      {
        value: "algo_ayuda",
        label: "Que pueda realizarlas necesitando solo un poco de ayuda",
        requiereTextoObjetivo: true,
      },
      {
        value: "zapatos_medias",
        label:
          "Que pueda realizarlas, pero aún con ayuda para amarrarme los zapatos o ponerme las medias",
      },
      {
        value: "independencia_total",
        label: "Poder bañarme y vestirme con independencia total",
      },
    ],
  },

  caminar_vehiculo: {
    objetivoGeneral: "Objetivo General: Poder caminar",
    opciones: [
      { value: "pasos_cortos", label: "Poder dar algunos pasos cortos" },
      {
        value: "dolor_soportable",
        label: "Poder caminar algunos pasos con dolor",
      },
      {
        value: "molestias_leves",
        label: "Poder caminar algunos pasos con molestia",
      },
      {
        value: "sin_molestias_viaje_corto",
        label: "Poder caminar unos pasos sin dolor",
      },
      {
        value: "actividad_fisica",
        label: "Poder caminar como actividad física",
      },
      {
        value: "aumentar_tiempo_distancia",
        label: "Poder aumentar el tiempo y la distancia",
      },
      {
        value: "aumentar_velocidad",
        label: "Poder caminar aumentando la velocidad",
      },
    ],
  },

  recoger_objetos: {
    objetivoGeneral: "Objetivo General: Poder recoger objetos del piso",
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
    objetivoGeneral: "Objetivo General: Cargar paquetes de diferentes tamaños",
    opciones: [
      { value: "pequenos", label: "Cargar paquetes pequeños" },
      { value: "medianos", label: "Cargar paquetes medianos" },
      { value: "cualquier", label: "Cargar paquetes de cualquier tamaño" },
    ],
  },

  conducir: {
    objetivoGeneral: "Objetivo General: Poder manejar carro o moto",
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

/** Minutos para objetivos con selector flexible (de pie, sentado, trabajo). */
export const MINUTOS_OBJETIVO_OPTIONS = [
  { value: "5", label: "5 minutos" },
  { value: "10", label: "10 minutos" },
  { value: "15", label: "15 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora o más" },
];

/** Horas para objetivo sentado AVD/laborales. */
export const HORAS_OBJETIVO_OPTIONS = [
  { value: "1", label: "1 hora" },
  { value: "2", label: "2 horas" },
  { value: "3", label: "3 horas" },
  { value: "4", label: "4 horas" },
  { value: "5", label: "5 horas" },
  { value: "6", label: "6 horas" },
  { value: "7", label: "7 horas" },
  { value: "8", label: "8 horas o más" },
];

/**
 * Etiquetas históricas de problemas (lectura de registros antiguos).
 * `vida_social` sigue activo en PROBLEMAS con etiqueta unificada; aquí se
 * conserva el texto previo. `recrearse` quedó fuera del listado Q8.
 */
export const LEGACY_PROBLEMA_LABELS = {
  vida_social_prev: "Restricción para hacer vida social",
  recrearse:
    "Restricción para participar en actividades sociales, recreativas o de ocio.",
  caminar_vehiculo_prev:
    "Dificultad para caminar, acomodarse en un carro o montarse en un vehículo",
};

/** Problemas retirados del formulario; útiles en filtros y viewers. */
export const PROBLEMAS_LEGACY = [
  {
    value: "recrearse",
    label: LEGACY_PROBLEMA_LABELS.recrearse,
  },
];

/**
 * Etiqueta legible de problema/síntoma (catálogo actual + legado).
 * @param {unknown} value
 */
export function formatProblemaLabel(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return (
    PROBLEMAS.find((p) => p.value === v)?.label ||
    LEGACY_PROBLEMA_LABELS[v] ||
    v
  );
}

/** Etiquetas de objetivos retirados o renombrados (lectura de registros antiguos). */
export const LEGACY_OBJETIVO_LABELS = {
  "limitacion_deporte:leve":
    "Poder hacer ejercicio de leve intensidad (escala de Borg 3/10)",
  "limitacion_deporte:moderada":
    "Poder hacer ejercicio de moderada intensidad (escala de Borg 6/10)",
  "limitacion_deporte:deporte_preferencia":
    "Poder practicar el deporte de mi preferencia (trote, pádel, tenis, fútbol, pilates)",
  "trastorno_trabajo:15min": "Poder trabajar por 15 minutos",
  "trastorno_trabajo:30min": "Poder trabajar por 30 minutos",
  "trastorno_trabajo:1a3h": "Poder trabajar de 1 a 3 horas",
  "trastorno_trabajo:7h": "Poder trabajar una jornada de 7 horas sin limitación",
  "vida_social:cumple_familia":
    "Poder asistir a cumpleaños o actividades familiares de leve exigencia física",
  "vida_social:misa_1h":
    "Poder ir a misa o reuniones religiosas de 1 hora o más de duración",
  "vida_social:eventos_2h":
    "Poder ir a cine, partidos o conciertos (2+ horas) con alta demanda física",
  cumple_familia:
    "Poder asistir a cumpleaños o actividades familiares de leve exigencia física",
  misa_1h:
    "Poder ir a misa o reuniones religiosas de 1 hora o más de duración",
  eventos_2h:
    "Poder ir a cine, partidos o conciertos (2+ horas) con alta demanda física",
  "recrearse:10_15": "Poder por 10 a 15 minutos",
  "recrearse:20_30": "Poder por 20 a 30 minutos",
  "recrearse:45_60": "Poder por 45 minutos a 1 hora",
  "recrearse:sin_restriccion": "Poder sin restricciones",
  "10_15": "Poder por 10 a 15 minutos",
  "20_30": "Poder por 20 a 30 minutos",
  "45_60": "Poder por 45 minutos a 1 hora",
  sin_restriccion: "Poder sin restricciones",
  "dormir:conciliar": "Quedarme dormido (conciliar el sueño)",
  "dormir:sin_dificultad": "Dormir sin dificultad",
  "autocuidado:con_ayuda": "Poder bañarme y vestirme con ayuda",
  "autocuidado:algo_ayuda": "Poder bañarme y vestirme con algo de ayuda",
  "autocuidado:zapatos_medias":
    "Poder bañarme y vestirme, pero aún con ayuda para amarrarme los zapatos o ponerme las medias",
  "autocuidado:independencia_total":
    "Poder bañarme y vestirme con independencia total",
  "caminar_vehiculo:dolor_soportable":
    "Poder caminar algunos pasos con dolor y acomodarme en el carro con molestia soportable",
  "caminar_vehiculo:molestias_leves":
    "Poder caminar algunos pasos con molestia y acomodarme en el carro con molestias leves",
  "caminar_vehiculo:sin_molestias_viaje_corto":
    "Poder caminar unos pasos sin dolor, acomodarme en el carro y tener un viaje corto sin molestias",
};

/** Problemas que piden texto libre de aclaración en Q8. */
export const PROBLEMAS_CON_ACLARACION = new Set([
  "intolerancia_postura",
  "intolerancia_sentado",
]);

/**
 * @param {string} sintomaKey
 * @param {string} objetivoValue
 */
function findObjetivoOpcion(sintomaKey, objetivoValue) {
  const opts = OBJETIVOS[sintomaKey]?.opciones || [];
  return opts.find((o) => o.value === objetivoValue);
}

/**
 * @param {string} sintomaKey
 * @param {string} objetivoValue base (sin sufijo)
 */
export function objetivoRequiereMinutos(sintomaKey, objetivoValue) {
  return !!findObjetivoOpcion(sintomaKey, objetivoValue)?.requiereMinutos;
}

/**
 * @param {string} sintomaKey
 * @param {string} objetivoValue base (sin sufijo)
 */
export function objetivoRequiereHoras(sintomaKey, objetivoValue) {
  return !!findObjetivoOpcion(sintomaKey, objetivoValue)?.requiereHoras;
}

/**
 * @param {string} sintomaKey
 * @param {string} objetivoValue base (sin sufijo)
 */
export function objetivoRequiereTextoObjetivo(sintomaKey, objetivoValue) {
  return !!findObjetivoOpcion(sintomaKey, objetivoValue)?.requiereTextoObjetivo;
}

/**
 * Clave en form.textos para respuesta abierta del objetivo (Sección 3).
 * limitacion_deporte no tiene aclaración en Q8, reutiliza la clave del síntoma.
 * @param {string} problema
 */
export function textoObjetivoFormKey(problema) {
  if (problema === "limitacion_deporte") return problema;
  return `${problema}__obj`;
}

/**
 * Persiste minutos en objetivo_i: `pie_mas_tiempo@30`
 * @param {string} base
 * @param {string} [minutos]
 */
export function composeObjetivoValue(base, minutos = "") {
  const b = String(base || "").trim();
  if (!b) return "";
  const m = String(minutos || "").trim();
  if (!m) return b;
  return `${b}@${m}`;
}

/**
 * Persiste horas en objetivo_i: `sentado_avd@h3`
 * @param {string} base
 * @param {string} [horas]
 */
export function composeObjetivoWithHoras(base, horas = "") {
  const b = String(base || "").trim();
  if (!b) return "";
  const h = String(horas || "").trim();
  if (!h) return b;
  return `${b}@h${h}`;
}

/**
 * Compone valor persistido según flags del objetivo.
 * @param {string} sintomaKey
 * @param {string} base
 * @param {{ minutos?: string, horas?: string }} [suffixes]
 */
export function composeObjetivoPersistido(sintomaKey, base, suffixes = {}) {
  const b = String(base || "").trim();
  if (!b) return "";
  if (objetivoRequiereHoras(sintomaKey, b)) {
    return composeObjetivoWithHoras(b, suffixes.horas);
  }
  if (objetivoRequiereMinutos(sintomaKey, b)) {
    return composeObjetivoValue(b, suffixes.minutos);
  }
  return b;
}

/** Sufijo embebido en objetivo_i cuando no hay columna textos/detalles en BD. */
export const OBJETIVO_DETALLE_SEP = "|";

/**
 * @param {string} objetivo
 * @param {string} [detalle]
 */
export function embedDetalleEnObjetivo(objetivo, detalle = "") {
  const obj = String(objetivo ?? "").trim();
  if (!obj) return "";
  const det = String(detalle ?? "")
    .trim()
    .replace(/\|/g, " ");
  if (!det) return obj;
  return `${obj}${OBJETIVO_DETALLE_SEP}${det}`;
}

/**
 * @param {Record<string, string>} textos
 * @param {string} sintoma
 */
export function resolveDetalleParaSintoma(textos, sintoma) {
  const direct = String(textos?.[sintoma] ?? "").trim();
  if (direct) return direct;
  const objKey = textoObjetivoFormKey(sintoma);
  return String(textos?.[objKey] ?? "").trim();
}

/**
 * @param {unknown} raw
 * @returns {{ value: string, minutos: string, horas: string, detalle: string }}
 */
export function parseObjetivoValue(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { value: "", minutos: "", horas: "", detalle: "" };

  const pipeIdx = s.indexOf(OBJETIVO_DETALLE_SEP);
  let detalle = "";
  let core = s;
  if (pipeIdx >= 0) {
    detalle = s.slice(pipeIdx + 1).trim();
    core = s.slice(0, pipeIdx);
  }

  const at = core.lastIndexOf("@");
  if (at > 0) {
    const value = core.slice(0, at);
    const suffix = core.slice(at + 1);
    if (suffix.startsWith("h") && /^\d+$/.test(suffix.slice(1))) {
      return { value, minutos: "", horas: suffix.slice(1), detalle };
    }
    if (/^\d+$/.test(suffix)) {
      return { value, minutos: suffix, horas: "", detalle };
    }
  }
  return { value: core, minutos: "", horas: "", detalle };
}

/**
 * Etiqueta de objetivo (legado, base@minutos, base@hN y texto complementario).
 * @param {string} sintomaKey
 * @param {unknown} objetivoRaw
 * @param {string} [detalleText]
 */
export function formatObjetivoLabel(sintomaKey, objetivoRaw, detalleText = "") {
  const { value, minutos, horas, detalle } = parseObjetivoValue(objetivoRaw);
  if (!value) return "";
  const opts = OBJETIVOS[sintomaKey]?.opciones || [];
  const found = opts.find((o) => o.value === value);
  let label =
    found?.label ||
    LEGACY_OBJETIVO_LABELS[`${sintomaKey}:${value}`] ||
    LEGACY_OBJETIVO_LABELS[value] ||
    value;
  if (minutos) {
    const minOpt = MINUTOS_OBJETIVO_OPTIONS.find((o) => o.value === minutos);
    label = `${label} (${minOpt?.label || `${minutos} minutos`})`;
  }
  if (horas) {
    const hOpt = HORAS_OBJETIVO_OPTIONS.find((o) => o.value === horas);
    label = `${label} (${hOpt?.label || `${horas} horas`})`;
  }
  const extra = String(detalleText || detalle || "").trim();
  if (extra) {
    label = `${label} (${extra})`;
  }
  return label;
}

export const ULTIMA_VEZ_OPTIONS = [
  { value: "1_2_meses", label: "1 a 2 meses" },
  { value: "3_6_meses", label: "3 a 6 meses" },
  { value: "7_12_meses", label: "7 a 12 meses" },
  { value: "mas_1_ano", label: "Más de 1 año" },
];

export const QUE_IMPIDE_OPTIONS = [
  { value: "dolor", label: "Dolor" },
  { value: "miedo", label: "Miedo a moverse o lastimarse" },
  { value: "debilidad", label: "Debilidad" },
];

export const INITIAL_FORM = {
  nombres: "",
  apellidos: "",
  tipoDocumento: "",
  documento: "",
  /** Orden = prioridad (1ª prioritaria, 2ª secundaria, 3ª terciaria). Máx. 3. */
  patologiasTop: [],
  otraPatologia: "",
  limitacionMoverse: "",
  actividadesAfectadas: [],
  problemasTop: [],
  otroProblema: "",
  objetivos: {},
  /** Minutos por problema (intolerancia pie/sentado, trabajo, etc.). */
  objetivosMinutos: {},
  /** Horas por problema (intolerancia sentado AVD/laborales). */
  objetivosHoras: {},
  /** Aclaraciones Q8 y textos abiertos de objetivos (Sección 3). */
  textos: {},
  objetivoExtra: "",
  adicionalNoPuede: "",
  ultimaVez: "",
  queImpide: [],
};
