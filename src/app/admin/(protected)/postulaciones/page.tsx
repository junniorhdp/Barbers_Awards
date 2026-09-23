import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostulacionesManager } from "@/components/admin/PostulacionesManager";

const FILTROS = [
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "aprobada", etiqueta: "Aprobadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "todas", etiqueta: "Todas" },
] as const;

export default async function AdminPostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado: estadoParam } = await searchParams;
  const estado = FILTROS.some((f) => f.valor === estadoParam) ? estadoParam! : "pendiente";

  const supabase = await createClient();
  let consulta = supabase
    .from("barberias")
    .select("id, nombre, direccion, ciudad, zona, fotos, created_at, estado_postulacion, motivo_rechazo")
    .order("created_at", { ascending: false });

  if (estado !== "todas") consulta = consulta.eq("estado_postulacion", estado);

  const { data: postulaciones } = await consulta;

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold text-gold">Postulaciones</h1>
      <div className="mb-6 flex gap-4 text-sm">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "pendiente" ? "/admin/postulaciones" : `/admin/postulaciones?estado=${f.valor}`}
            className={estado === f.valor ? "font-semibold text-violet-neon underline" : "text-muted"}
          >
            {f.etiqueta}
          </Link>
        ))}
      </div>
      <PostulacionesManager postulaciones={postulaciones ?? []} />
    </main>
  );
}
