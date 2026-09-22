import { z } from "zod";

// ARCHITECTURE.md 3.7: JSONB de horarios, horas en formato 24h, zona
// America/Bogota. Un objeto vacío {} oculta la sección en el perfil público.
export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

export type Dia = (typeof DIAS)[number];

export const DIA_LABELS: Record<Dia, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
  dom: "Domingo",
};

const HoraSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM (24 h).");

const FranjaSchema = z
  .tuple([HoraSchema, HoraSchema])
  .refine(([inicio, fin]) => inicio < fin, "La hora de inicio debe ser antes que la de fin.");

const HorarioDiaSchema = z.object({
  abierto: z.boolean(),
  franjas: z.array(FranjaSchema),
});

export const HorariosSchema = z.record(z.enum(DIAS), HorarioDiaSchema);

export type Horarios = z.infer<typeof HorariosSchema>;

export function horarioDiaVacio(): Horarios[Dia] {
  return { abierto: false, franjas: [] };
}

export function horariosVacios(): Horarios {
  return Object.fromEntries(DIAS.map((dia) => [dia, horarioDiaVacio()])) as Horarios;
}

function textoDia(dia: Horarios[Dia]): string {
  if (!dia.abierto || dia.franjas.length === 0) return "Cerrado";
  return dia.franjas.map(([inicio, fin]) => `${inicio} – ${fin}`).join(", ");
}

export type FilaHorario = { etiqueta: string; texto: string };

type GrupoEnProgreso = { texto: string; dias: Dia[] };

// ARCHITECTURE.md 3.7: "los días consecutivos con igual horario se agrupan
// (Lunes – Viernes)". Compara el texto ya formateado, así "cerrado" también
// se agrupa con otros días cerrados consecutivos.
export function agruparHorarios(horarios: Horarios): FilaHorario[] {
  const grupos: GrupoEnProgreso[] = [];

  for (const dia of DIAS) {
    const texto = textoDia(horarios[dia]);
    const anterior = grupos[grupos.length - 1];

    if (anterior && anterior.texto === texto) {
      anterior.dias.push(dia);
    } else {
      grupos.push({ texto, dias: [dia] });
    }
  }

  return grupos.map(({ texto, dias }) => ({
    etiqueta: dias.length > 1 ? `${DIA_LABELS[dias[0]]} – ${DIA_LABELS[dias[dias.length - 1]]}` : DIA_LABELS[dias[0]],
    texto,
  }));
}

// Zona fija America/Bogota (ARCHITECTURE.md, decisión abierta 14: sin
// resolver, se asume Colombia en todo el MVP). Se calcula en el navegador
// para no congelar el estado en la caché de ISR (3.7).
export function estaAbiertoAhora(horarios: Horarios): boolean {
  const ahora = new Date();
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partes = formatter.formatToParts(ahora);
  const horaActual = `${partes.find((p) => p.type === "hour")?.value}:${partes.find((p) => p.type === "minute")?.value}`;
  const diaAbreviado = partes.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "";

  const MAPA_DIA: Record<string, Dia> = {
    lun: "lun",
    mar: "mar",
    mié: "mie",
    mie: "mie",
    jue: "jue",
    vie: "vie",
    sáb: "sab",
    sab: "sab",
    dom: "dom",
  };
  const diaClave = Object.keys(MAPA_DIA).find((k) => diaAbreviado.startsWith(k));
  if (!diaClave) return false;

  const horarioDia = horarios[MAPA_DIA[diaClave]];
  if (!horarioDia?.abierto) return false;

  return horarioDia.franjas.some(([inicio, fin]) => horaActual >= inicio && horaActual <= fin);
}
