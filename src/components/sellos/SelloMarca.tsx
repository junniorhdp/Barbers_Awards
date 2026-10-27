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
}) {
  const accesible = etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true as const };

  return (
    <svg
      viewBox="0 0 48 48"
      width={tamano}
      height={tamano}
      fill="none"
      stroke={color}
      focusable="false"
      className="shrink-0"
      {...accesible}
    >
      <path d={MARCO} strokeWidth={1.5} strokeLinejoin="round" opacity={apagado ? 0.38 : 1} />
      {anillo ? <circle cx={24} cy={24} r={11.5} strokeWidth={1} opacity={apagado ? 0.25 : 0.5} /> : null}
      {glifo !== "ninguno" ? (
        <path d={GLIFOS[glifo]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
}
