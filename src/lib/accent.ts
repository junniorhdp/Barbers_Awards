// Llaves de acento del perfil público (ARCHITECTURE.md 2.6). Se guarda solo la
// llave, nunca un hex libre: así se garantiza el contraste y no se admite CSS
// arbitrario. Debe coincidir con el CHECK barberias_color_acento_check.
export const ACENTOS = ["dorado", "morado", "verde", "rojo"] as const;

export type Acento = (typeof ACENTOS)[number];

export function esAcentoValido(valor: string): valor is Acento {
  return (ACENTOS as readonly string[]).includes(valor);
}

export const ACENTO_LABELS: Record<Acento, string> = {
  dorado: "Dorado",
  morado: "Morado",
  verde: "Verde",
  rojo: "Rojo",
};

export const ACENTO_SWATCH: Record<Acento, string> = {
  dorado: "#D4AF37",
  morado: "#7C3AED",
  verde: "#15803D",
  rojo: "#B91C1C",
};
