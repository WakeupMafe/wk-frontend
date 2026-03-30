export const TIPOS_DOCUMENTO = [
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cedula", label: "Cédula" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
];

export const LIMITACION_MOVERSE = [
  { value: "mucho", label: "Mucho" },
  { value: "bastante", label: "Bastante" },
  { value: "poco", label: "Poco" },
  { value: "nada", label: "Nada" },
];

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
];

export const PROBLEMAS = [
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

export const OBJETIVOS = {
  dolor: {
    objetivoGeneral: "Objetivo General: Disminuir el dolor",
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
      "Objetivo General: Lograr mantener una postura (sentado, acostado o de pie) por un tiempo específico",
    opciones: [
      { value: "5min", label: "Lograr mantener la postura por 5 minutos" },
      { value: "10min", label: "Lograr mantener la postura por 10 minutos" },
      { value: "15min", label: "Lograr mantener la postura por 15 minutos" },
      { value: "30min", label: "Lograr mantener la postura por 30 minutos" },
      { value: "60min", label: "Lograr mantener la postura por 1 hora o más" },
    ],
  },

  limitacion_deporte: {
    objetivoGeneral: "Objetivo General: Poder hacer ejercicio o deporte",
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
          "Poder practicar el deporte de mi preferencia (trote, pádel, tenis, fútbol, pilates)",
      },
    ],
  },

  trastorno_trabajo: {
    objetivoGeneral:
      "Objetivo General: Trabajar por un periodo de tiempo específico sin incomodidad",
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
    objetivoGeneral: "Objetivo General: Tener una vida social normal",
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
          "Poder ir a cine, partidos o conciertos (2+ horas) con alta demanda física",
      },
    ],
  },

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
      { value: "conciliar", label: "Quedarme dormido (conciliar el sueño)" },
      { value: "2a4", label: "Dormir de 2 a 4 horas sin molestia" },
      { value: "5a8", label: "Dormir de 5 a 8 horas sin molestia" },
      { value: "sin_dificultad", label: "Dormir sin dificultad" },
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
  },

  caminar_vehiculo: {
    objetivoGeneral:
      "Objetivo General: Poder caminar, tomar transporte y realizar actividades de la vida diaria",
    opciones: [
      { value: "pasos_cortos", label: "Poder dar algunos pasos cortos" },
      {
        value: "dolor_soportable",
        label:
          "Poder caminar algunos pasos con dolor y acomodarme en el carro con molestia soportable",
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
};
