import "server-only";

// Folio público de verificación (CU-18, ARCHITECTURE.md 3.6). Alfabeto sin
// I, L, O ni 0/1 para que no se confundan al leerlo o transcribirlo a mano.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generarFolio(anio = new Date().getFullYear()) {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return `BA-${anio}-${sufijo}`; // ej. BA-2026-K7M4P
}
