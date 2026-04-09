import { randomInt } from "node:crypto";

/**
 * Misma lógica que `backend/utils/pin_utils.py`:
 * 2 letras mayúsculas + 3 dígitos (ej. QF482).
 */
export function generarPin2Letras3Numeros(): string {
  const letras = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + randomInt(0, 26)),
  ).join("");
  const numeros = Array.from({ length: 3 }, () =>
    String(randomInt(0, 10)),
  ).join("");
  return `${letras}${numeros}`;
}
