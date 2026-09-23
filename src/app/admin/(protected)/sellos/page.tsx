import { createClient } from "@/lib/supabase/server";
import { SellosManager } from "@/components/admin/SellosManager";

export default async function AdminSellosPage() {
  const supabase = await createClient();
  const { data: sellos } = await supabase
    .from("catalogo_sellos")
    .select("id, nombre_sello, nivel, requisitos, entidad_emisora, color_hex")
    .order("nombre_sello", { ascending: true });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Catálogo de sellos</h1>
      <SellosManager sellosIniciales={sellos ?? []} />
    </main>
  );
}
