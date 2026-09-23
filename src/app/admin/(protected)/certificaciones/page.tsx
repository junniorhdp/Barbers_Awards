import { createClient } from "@/lib/supabase/server";
import { CertificacionesManager } from "@/components/admin/CertificacionesManager";

export default async function AdminCertificacionesPage() {
  const supabase = await createClient();

  const { data: barberias } = await supabase
    .from("barberias")
    .select(
      `
      id, nombre, slug, estado_sello,
      certificaciones ( id, folio_verificacion, estado, fecha_emision, fecha_vencimiento )
    `,
    )
    .eq("estado_postulacion", "aprobada")
    .order("nombre", { ascending: true });

  const { data: sellos } = await supabase
    .from("catalogo_sellos")
    .select("id, nombre_sello, nivel")
    .in("nivel", ["Gold", "Silver"])
    .order("nombre_sello", { ascending: true });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Certificaciones</h1>
      <CertificacionesManager
        barberias={
          (barberias ?? []) as unknown as {
            id: string;
            nombre: string;
            slug: string;
            estado_sello: string;
            certificaciones: {
              id: string;
              folio_verificacion: string;
              estado: string;
              fecha_emision: string;
              fecha_vencimiento: string | null;
            }[];
          }[]
        }
        sellos={sellos ?? []}
      />
    </main>
  );
}
