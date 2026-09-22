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
