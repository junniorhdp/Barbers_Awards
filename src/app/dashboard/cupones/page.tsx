import { createClient } from "@/lib/supabase/server";
import { CuponesManager } from "@/components/dashboard/CuponesManager";
import { RedimirLeadManager, type Lead } from "@/components/dashboard/RedimirLeadManager";

const LIMITE_LEADS = 50;

export default async function DashboardCuponesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: barberia } = await supabase
    .from("barberias")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  if (!barberia) {
    return <p className="p-8 text-red-400">No se encontró tu barbería.</p>;
  }

  const [{ data: cupones }, { data: leads }] = await Promise.all([
    supabase
      .from("cupones_descuento")
      .select("id, codigo, descripcion, tipo_descuento, valor_descuento, fecha_fin, veces_redimido, limite_usos, es_activo")
      .eq("barberia_id", barberia.id)
      .order("creado_en", { ascending: false }),
    supabase
      .from("leads_whatsapp")
      .select(
        `
        id, nombre_cliente, telefono_cliente, creado_en, conversion_exitosa, cupon_id,
        servicios ( nombre ), barberos ( nombre ),
        cupones_descuento ( codigo, veces_redimido, limite_usos )
      `,
      )
      .eq("barberia_id", barberia.id)
      .order("creado_en", { ascending: false })
      .limit(LIMITE_LEADS),
  ]);

  return (
    <main className="flex flex-col gap-10 p-8">
      <section>
        <h1 className="mb-6 text-2xl font-semibold text-gold">Redimir cupón (CU-14)</h1>
        <RedimirLeadManager leadsIniciales={(leads ?? []) as unknown as Lead[]} />
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold text-gold">Cupones</h2>
        <CuponesManager cuponesIniciales={cupones ?? []} />
      </section>
    </main>
  );
}
