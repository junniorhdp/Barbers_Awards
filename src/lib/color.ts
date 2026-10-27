// Utilidades mínimas de color para SealBadge (ARCHITECTURE.md 2.4): degradado
// hacia una versión más oscura de catalogo_sellos.color_hex y un color de
// texto legible calculado por contraste real de WCAG (no una aproximación).

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

// Luminancia relativa de WCAG (con corrección gamma sRGB), no el promedio
// ponderado simple que se usaba antes: ese heurístico subestimaba el
// contraste real en tonos medios saturados (rosados, por ejemplo).
function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((canal) => {
    const s = canal / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razonContraste(hexA: string, hexB: string): number {
  const la = luminanciaRelativa(hexA);
  const lb = luminanciaRelativa(hexB);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

const TEXTO_OSCURO = "#101012";
const TEXTO_CLARO = "#FAFAFA";

// Elige el color de texto (oscuro o claro) que maximiza el PEOR contraste
// entre todos los colores de fondo dados. SealBadge la llama con ambos
// extremos del degradado (color_hex y su versión oscurecida): si solo se
// evaluara el extremo claro, un texto oscuro podía quedar ilegible sobre el
// extremo oscuro del mismo badge.
export function colorTextoLegible(...coloresDeFondo: string[]): string {
  const peorConOscuro = Math.min(...coloresDeFondo.map((c) => razonContraste(TEXTO_OSCURO, c)));
  const peorConClaro = Math.min(...coloresDeFondo.map((c) => razonContraste(TEXTO_CLARO, c)));
  return peorConOscuro >= peorConClaro ? TEXTO_OSCURO : TEXTO_CLARO;
}
