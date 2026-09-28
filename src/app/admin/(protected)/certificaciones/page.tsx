import { createClient } from "@/lib/supabase/server";
import { CertificacionesManager } from "@/components/admin/CertificacionesManager";

type BarberiaFila = {
  id: string;
  nombre: string;
  slug: string;
  estado_sello: string;
  certificaciones: {
    id: string;
    categoria: string;
    folio_verificacion: string;
    estado: string;
    fecha_emision: string;
    fecha_vencimiento: string | null;
  }[];
};

export default async function AdminCertificacionesPage() {
  const supabase = await createClient();

  const [{ data: barberias }, { data: sellos }] = await Promise.all([
    supabase
      .from("barberias")
      .select(
        `
        id, nombre, slug, estado_sello,
        certificaciones ( id, categoria, folio_verificacion, estado, fecha_emision, fecha_vencimiento )
      `,
      )
      .eq("estado_postulacion", "aprobada")
      .order("nombre", { ascending: true }),
    supabase.from("catalogo_sellos").select("id, nombre_sello, nivel, categoria").order("nombre_sello", { ascending: true }),
  ]);

  const sellosCalidad = (sellos ?? []).filter((s) => s.categoria === "calidad");
  const sellosReconocimiento = (sellos ?? []).filter((s) => s.categoria === "reconocimiento");

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Certificaciones</h1>
      <CertificacionesManager
        barberias={(barberias ?? []) as unknown as BarberiaFila[]}
        sellosCalidad={sellosCalidad}
        sellosReconocimiento={sellosReconocimiento}
      />
    </main>
  );
}
