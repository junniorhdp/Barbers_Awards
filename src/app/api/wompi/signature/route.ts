import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PLANES, buildReference, integritySignature } from "@/lib/wompi";

const Body = z.object({ plan: z.enum(["mensual", "anual"]) });

// El monto nunca lo decide el navegador: sale de PLANES, que lee las
// variables de entorno del servidor (ARCHITECTURE.md 4.1.1, paso 2).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Plan inválido." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autenticado." }, { status: 401 });

  const { data: barberia } = await supabase
    .from("barberias")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!barberia) return Response.json({ error: "No se encontró tu barbería." }, { status: 404 });

  const { plan } = parsed.data;
  const amountInCents = PLANES[plan].cents;
  const reference = buildReference(barberia.id, plan);
  const signature = integritySignature(reference, amountInCents);

  return Response.json({ reference, amountInCents, signature });
}
