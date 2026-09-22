import { createClient } from "@/lib/supabase/server";
import { ServiciosManager } from "@/components/dashboard/ServiciosManager";

export default async function DashboardServiciosPage() {
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

  const { data: servicios } = await supabase
    .from("servicios")
    .select("id, nombre, descripcion, precio, duracion_min, icono, destacado, es_activo, orden")
    .eq("barberia_id", barberia.id)
    .order("orden", { ascending: true });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Servicios</h1>
      <ServiciosManager serviciosIniciales={servicios ?? []} />
    </main>
  );
}
