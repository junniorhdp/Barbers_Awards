import { createClient } from "@/lib/supabase/server";
import { EquipoManager } from "@/components/dashboard/EquipoManager";

export default async function DashboardEquipoPage() {
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

  const { data: barberos } = await supabase
    .from("barberos")
    .select("id, nombre, foto_avatar, experiencia_anos, especialidades, diplomas_urls")
    .eq("barberia_id", barberia.id)
    .order("created_at", { ascending: true });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Equipo</h1>
      <EquipoManager barberiaId={barberia.id} barberosIniciales={barberos ?? []} />
    </main>
  );
}
