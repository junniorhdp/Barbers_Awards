import { createClient } from "@/lib/supabase/server";
import { CheckoutManager } from "@/components/dashboard/CheckoutManager";

export default async function DashboardCheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: barberia } = await supabase
    .from("barberias")
    .select("id, estado_suscripcion, plan_tipo, fecha_vencimiento_suscripcion")
    .eq("owner_id", user!.id)
    .single();

  if (!barberia) {
    return <p className="p-8 text-red-400">No se encontró tu barbería.</p>;
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Activar Sello Verificado</h1>
      <CheckoutManager
        barberiaId={barberia.id}
        suscripcionInicial={{
          estado_suscripcion: barberia.estado_suscripcion,
          plan_tipo: barberia.plan_tipo,
          fecha_vencimiento_suscripcion: barberia.fecha_vencimiento_suscripcion,
        }}
        precios={{
          mensual: Number(process.env.PLAN_MENSUAL_PRECIO_COP),
          anual: Number(process.env.PLAN_ANUAL_PRECIO_COP),
        }}
      />
    </main>
  );
}
