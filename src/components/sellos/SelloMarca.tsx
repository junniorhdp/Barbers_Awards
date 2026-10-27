import { colorTextoLegible } from "@/lib/color";

// La marca del sello de Barbers Awards (DESIGN.md 13.1): un marco dentado con
// un glifo central que dice el estado. Solo presentación: qué glifo se usa lo
// decide quien la llama, a partir de situacionSello() y compañía.

export type GlifoSello = "vigente" | "en-proceso" | "revocado" | "pausado" | "ninguno";

const MARCO =
  "M24 3l5.6 3.3 6.5-.3 1.8 6.2 5 4.2-3 5.8 1 6.4-6.3 1.8-4 5-6.6-2.2-6.6 2.2-4-5-6.3-1.8 1-6.4-3-5.8 5-4.2 1.8-6.2 6.5.3L24 3z";

const GLIFOS: Record<Exclude<GlifoSello, "ninguno">, string> = {
  vigente: "M17.5 24.2l4.5 4.5 9-9",
  "en-proceso": "M24 17.5V24l4.5 3",
  revocado: "M19 19l10 10M29 19l-10 10",
  pausado: "M21 19v10M27 19v10",
};

export function SelloMarca({
  color = "currentColor",
  tamano = 40,
  glifo,
  apagado = false,
  anillo = true,
  etiqueta,
  relleno,
  discontinuo = false,
  dibujar = false,
}: {
  color?: string;
  tamano?: number;
  glifo: GlifoSello;
  // Estados sin certificación vigente: el marco se lee apagado sin perder la forma.
  apagado?: boolean;
  anillo?: boolean;
  // Con etiqueta, la marca comunica (role="img"); sin ella, acompaña a un
  // texto que ya lo dice y se oculta a los lectores de pantalla.
  etiqueta?: string;
  // Opcionales (2026-10-26), no cambian ningún uso existente:
  // - relleno: rellena el marco (DESIGN.md 8.4, marca rellena = nivel de
  //   calidad). El anillo y el glifo se trazan entonces con el color legible
  //   sobre ese relleno, para que no desaparezcan.
  // - discontinuo: trazo discontinuo en el marco ("este folio no existe").
  relleno?: string;
  discontinuo?: boolean;
  // Opcional: el trazo se dibuja UNA vez al cargar (~0,6 s) y se queda
  // quieto; sin bucles. Con prefers-reduced-motion aparece ya dibujado. Los
  // estilos viven en globals.css (.sello-dibujo). Solo para el caso positivo.
  dibujar?: boolean;
}) {
  const accesible = etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true as const };
  const trazoInterior = relleno ? colorTextoLegible(relleno) : undefined;
  // pathLength = 1 normaliza el largo de cada trazo para animar el dibujo.
  const largo = dibujar ? 1 : undefined;

  return (
    <svg
      viewBox="0 0 48 48"
      width={tamano}
      height={tamano}
      fill="none"
      stroke={color}
      focusable="false"
      className={dibujar ? "sello-dibujo shrink-0" : "shrink-0"}
      {...accesible}
    >
      <path
        d={MARCO}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={apagado ? 0.38 : 1}
        fill={relleno ?? "none"}
        strokeDasharray={discontinuo ? "2.5 2.5" : undefined}
        pathLength={largo}
        className={dibujar ? "sello-trazo sello-marco" : undefined}
      />
      {anillo ? (
        <circle
          cx={24}
          cy={24}
          r={11.5}
          strokeWidth={1}
          opacity={apagado ? 0.25 : 0.5}
          stroke={trazoInterior}
          pathLength={largo}
          className={dibujar ? "sello-trazo sello-anillo" : undefined}
        />
      ) : null}
      {glifo !== "ninguno" ? (
        <path
          d={GLIFOS[glifo]}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke={trazoInterior}
          pathLength={largo}
          className={dibujar ? "sello-trazo sello-glifo" : undefined}
        />
      ) : null}
    </svg>
  );
}
