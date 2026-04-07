/**
 * Iconos “Ir al inicio”.
 * - Hombres (y heurística por defecto): src/assets/home.png
 * - Mujeres (tono violeta #a57cf1 en el recurso): src/assets/homerosa.png
 */
import homeBlue from "./home.png";
import homeViolet from "./homerosa.png";

/**
 * @param {"male" | "female"} gender Resultado de inferGenderFromName
 * @returns {string} URL del asset (Vite)
 */
export function homeIconSrcForGender(gender) {
  return gender === "female" ? homeViolet : homeBlue;
}

export { homeBlue, homeViolet };
