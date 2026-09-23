import { createClient } from "@/lib/supabase/server";
import { CuponesManager } from "@/components/dashboard/CuponesManager";

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

  const { data: cupones } = await supabase
    .from("cupones_descuento")
    .select("id, codigo, descripcion, tipo_descuento, valor_descuento, fecha_fin, veces_redimido, limite_usos, es_activo")
    .eq("barberia_id", barberia.id)
    .order("creado_en", { ascending: false });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Cupones</h1>
      <CuponesManager cuponesIniciales={cupones ?? []} />
    </main>
  );
}
