/**
 * Heurística por primer nombre (español / Latinoamérica).
 * No es infalible; por defecto se asume masculino (azul).
 * @param {string} usuario Nombre completo o primer nombre
 * @returns {'female' | 'male'}
 */
export function inferGenderFromName(usuario) {
  const raw = String(usuario ?? "").trim();
  if (!raw) return "male";

  const first = raw.split(/\s+/)[0];
  const n = normalizeToken(first);

  if (FEMALE_NAMES.has(n)) return "female";
  if (MALE_NAMES.has(n)) return "male";
  if (n.endsWith("a")) return "female";
  if (n.endsWith("o")) return "male";
  return "male";
}

function normalizeToken(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Nombres femeninos que no siguen bien la regla -a / -o (tras normalizar) */
const FEMALE_NAMES = new Set([
  "carmen",
  "mercedes",
  "ines",
  "luz",
  "sol",
  "raquel",
  "ester",
  "isabel",
  "yasmin",
  "yasmina",
  "consuelo",
  "milagros",
  "araceli",
  "beatriz",
  "iris",
  "ellen",
  "astrid",
  "monica",
  "dolores",
  "pilar",
  "lourdes",
  "soledad",
  "concepcion",
  "asuncion",
]);

/** Nombres masculinos explícitos (p. ej. terminan en -a la regla fallaría) */
const MALE_NAMES = new Set([
  "jose",
  "juan",
  "luis",
  "carlos",
  "pedro",
  "antonio",
  "manuel",
  "francisco",
  "david",
  "daniel",
  "pablo",
  "sergio",
  "andres",
  "miguel",
  "angel",
  "rafael",
  "gabriel",
  "samuel",
  "jorge",
  "alberto",
  "roberto",
  "ricardo",
  "fernando",
  "eduardo",
  "vicente",
  "ernesto",
  "oscar",
  "marcos",
  "nicolas",
  "felipe",
  "rodrigo",
  "gonzalo",
  "ignacio",
  "santiago",
  "sebastian",
  "esteban",
  "guillermo",
  "hugo",
  "ivan",
  "mario",
  "martin",
  "adrian",
  "cristian",
  "christian",
  "alexander",
  "alejandro",
  "diego",
  "javier",
  "ruben",
  "jesus",
  "moises",
  "elias",
  "jonathan",
  "kevin",
  "brian",
  "bryan",
]);
