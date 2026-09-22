// Utilidades mínimas de color para SealBadge (ARCHITECTURE.md 2.4): degradado
// hacia una versión más oscura de catalogo_sellos.color_hex y un color de
// texto legible calculado por contraste (WCAG luminancia relativa simple).

function hexARgb(hex: string): [number, number, number] {
  const limpio = hex.replace("#", "");
  const valor = parseInt(limpio.length === 3 ? limpio.replace(/(.)/g, "$1$1") : limpio, 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

function rgbAHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;
}

export function oscurecer(hex: string, factor = 0.35): string {
  const [r, g, b] = hexARgb(hex);
  return rgbAHex([r * (1 - factor), g * (1 - factor), b * (1 - factor)]);
}

export function colorTextoLegible(hex: string): string {
  const [r, g, b] = hexARgb(hex);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? "#101012" : "#FAFAFA";
}
