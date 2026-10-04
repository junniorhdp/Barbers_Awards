import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const PLANES = {
  mensual: { dias: 30, cents: Number(process.env.PLAN_MENSUAL_PRECIO_COP) * 100 },
  anual: { dias: 365, cents: Number(process.env.PLAN_ANUAL_PRECIO_COP) * 100 },
} as const;
export type PlanTipo = keyof typeof PLANES;

// Guion bajo como separador: los UUID contienen guiones, pero no guiones
// bajos (ARCHITECTURE.md 4.1.2).
export const buildReference = (barberiaId: string, plan: PlanTipo) =>
  `BA_${barberiaId}_${plan}_${Date.now()}`;

export function parseReference(ref: string): { barberiaId: string; plan: PlanTipo } | null {
  const [prefijo, barberiaId, plan] = ref.split("_");
  if (prefijo !== "BA" || !barberiaId || (plan !== "mensual" && plan !== "anual")) return null;
  return { barberiaId, plan };
}

// SHA-256 hex de: referencia + monto en centavos + moneda + secreto de
// integridad (firma que el cliente usa para abrir el widget de Wompi).
// .trim() por si .env.local cargó un espacio o salto de línea invisible al
// final del secreto — eso rompe la firma sin ningún error visible aquí.
export const integritySignature = (reference: string, amountInCents: number, currency = "COP") =>
  createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${(process.env.WOMPI_INTEGRITY_SECRET ?? "").trim()}`)
    .digest("hex");

// Forma real del evento que envía Wompi al webhook (ARCHITECTURE.md 4.1.3).
export const WompiEventSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string(),
      status: z.string(),
      amount_in_cents: z.number(),
      currency: z.string(),
      reference: z.string(),
      payment_method_type: z.string(),
    }),
  }),
  signature: z.object({
    properties: z.array(z.string()),
    checksum: z.string(),
  }),
  timestamp: z.number(),
});
export type WompiEvent = z.infer<typeof WompiEventSchema>;

function valorAnidado(obj: unknown, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((actual, clave) => {
    if (actual && typeof actual === "object" && clave in actual) {
      return (actual as Record<string, unknown>)[clave];
    }
    return undefined;
  }, obj);
}

// Verifica la firma del webhook en tiempo constante (defensa en profundidad,
// ARCHITECTURE.md 4.1.5).
export function verifyWompiEvent(evt: WompiEvent): boolean {
  const valores = evt.signature.properties.map((ruta) => valorAnidado(evt.data, ruta));
  if (valores.some((v) => v === undefined || v === null)) return false;

  const esperado = createHash("sha256")
    .update(`${valores.join("")}${evt.timestamp}${(process.env.WOMPI_EVENTS_SECRET ?? "").trim()}`)
    .digest("hex");
  const recibido = String(evt.signature.checksum).toLowerCase();

  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}
