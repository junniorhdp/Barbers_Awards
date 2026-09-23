import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { excedeLimiteFrecuencia } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  barberia_id: z.string().uuid(),
  nombre_cliente: z.string().min(1).max(120),
  telefono_cliente: z.string().regex(/^[0-9]{10,15}$/),
  servicio_id: z.string().uuid().nullish(),
  barbero_id: z.string().uuid().nullish(),
  cupon_id: z.string().uuid().nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "datos inválidos" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  if (excedeLimiteFrecuencia(`${ip}:${parsed.data.barberia_id}`)) {
    return Response.json({ error: "demasiadas solicitudes" }, { status: 429 });
  }

  const db = createAdminClient();
  const { data: barberia } = await db
    .from("barberias")
    .select("id")
    .eq("id", parsed.data.barberia_id)
    .neq("estado_sello", "inactivo")
    .maybeSingle();
  if (!barberia) return Response.json({ error: "no encontrada" }, { status: 404 });

  const { error } = await db.from("leads_whatsapp").insert(parsed.data);

  if (error?.code === "23505" && parsed.data.cupon_id) {
    // Ese teléfono ya redimió ese cupón: se registra el lead igual, sin el descuento.
    const { barberia_id, nombre_cliente, telefono_cliente, servicio_id, barbero_id } = parsed.data;
    const reintento = await db
      .from("leads_whatsapp")
      .insert({ barberia_id, nombre_cliente, telefono_cliente, servicio_id, barbero_id });
    if (reintento.error) return Response.json({ error: "no se pudo registrar" }, { status: 500 });
    return Response.json({ cuponRechazado: true }, { status: 201 });
  }
  if (error) return Response.json({ error: "no se pudo registrar" }, { status: 500 });
  return new Response(null, { status: 201 });
}
