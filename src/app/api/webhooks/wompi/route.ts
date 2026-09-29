import { createAdminClient } from "@/lib/supabase/admin";
import { PLANES, WompiEventSchema, parseReference, verifyWompiEvent, type PlanTipo } from "@/lib/wompi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function activarSuscripcion(
  db: ReturnType<typeof createAdminClient>,
  barberiaId: string,
  plan: PlanTipo,
) {
  const { data: b } = await db
    .from("barberias")
    .select("estado_suscripcion, fecha_vencimiento_suscripcion")
    .eq("id", barberiaId)
    .single();

  const ahora = new Date();
  const vence = b?.fecha_vencimiento_suscripcion ? new Date(b.fecha_vencimiento_suscripcion) : null;
  const vigente = b?.estado_suscripcion === "activa" && vence !== null && vence > ahora;
  const base = vigente ? vence! : ahora;
  const nuevoVencimiento = new Date(base.getTime() + PLANES[plan].dias * 86_400_000);

  const { error } = await db
    .from("barberias")
    .update({
      estado_suscripcion: "activa",
      plan_tipo: plan,
      fecha_inicio_suscripcion: vigente ? undefined : ahora.toISOString(),
      fecha_vencimiento_suscripcion: nuevoVencimiento.toISOString(),
    })
    .eq("id", barberiaId);
  if (error) throw error; // devuelve 500 y Wompi reintenta
}

export async function POST(req: Request) {
  const parsedBody = WompiEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success || !verifyWompiEvent(parsedBody.data)) {
    return new Response("firma inválida", { status: 401 });
  }
  const evt = parsedBody.data;
  if (evt.event !== "transaction.updated") return new Response("ignorado", { status: 200 });

  const tx = evt.data.transaction;
  const ref = parseReference(tx.reference);
  if (!ref) return new Response("referencia desconocida", { status: 200 });

  const db = createAdminClient();

  const { data: previo } = await db
    .from("transacciones_pago")
    .select("estado")
    .eq("wompi_transaction_id", tx.id)
    .maybeSingle();

  const { error } = await db.from("transacciones_pago").upsert(
    {
      barberia_id: ref.barberiaId,
      wompi_transaction_id: tx.id,
      wompi_reference: tx.reference,
      monto: tx.amount_in_cents / 100,
      moneda: tx.currency,
      metodo_pago: tx.payment_method_type,
      estado: tx.status,
    },
    { onConflict: "wompi_transaction_id" },
  );
  if (error) return new Response("error de base de datos", { status: 500 });

  const primeraAprobacion = tx.status === "APPROVED" && previo?.estado !== "APPROVED";
  if (primeraAprobacion && tx.amount_in_cents === PLANES[ref.plan].cents) {
    try {
      await activarSuscripcion(db, ref.barberiaId, ref.plan);
    } catch {
      return new Response("error activando la suscripción", { status: 500 });
    }
  }
  return new Response("ok", { status: 200 });
}
