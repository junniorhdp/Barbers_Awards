import { createClient } from "@/lib/supabase/public";
import { DirectorioFiltros } from "@/components/barberias/DirectorioFiltros";
import { BarberiaCard } from "@/components/barberias/BarberiaCard";
import { PlatformHeader } from "@/components/ui/PlatformHeader";

type ParametrosBusqueda = {
  q?: string;
  ciudad?: string;
  zona?: string;
  sello?: string;
};

// CU-02: busca por nombre/ciudad/zona Y por "servicios ofertados". PostgREST
// no permite un OR entre columnas propias y una tabla relacionada en una
// sola consulta, así que se resuelve con dos consultas (Opción A, aprobada
// sobre la Opción B — una función SQL con JOIN real — para no meter una
// migración nueva en esta fase). Si el directorio crece mucho, una función
// `search_barberias(...)` en SCHEMA.sql sería la mejora natural de
// rendimiento (un solo round trip en vez de dos).
async function buscarBarberias(params: ParametrosBusqueda) {
  const supabase = createClient();
  const { q, ciudad, zona, sello } = params;

  let idsPorServicio: string[] = [];
  if (q) {
    const { data: serviciosCoincidentes } = await supabase
      .from("servicios")
      .select("barberia_id")
      .eq("es_activo", true)
      .ilike("nombre", `%${q}%`);
    idsPorServicio = Array.from(new Set((serviciosCoincidentes ?? []).map((s) => s.barberia_id)));
  }

  let consulta = supabase
    .from("barberias")
    .select("id, nombre, slug, ciudad, zona, fotos, estado_sello")
    .neq("estado_sello", "inactivo");

  if (ciudad) consulta = consulta.ilike("ciudad", `%${ciudad}%`);
  if (zona) consulta = consulta.ilike("zona", `%${zona}%`);
  if (sello) consulta = consulta.eq("estado_sello", sello);

  if (q) {
    const condiciones = [`nombre.ilike.%${q}%`, `ciudad.ilike.%${q}%`, `zona.ilike.%${q}%`];
    if (idsPorServicio.length > 0) {
      condiciones.push(`id.in.(${idsPorServicio.join(",")})`);
    }
    consulta = consulta.or(condiciones.join(","));
  }

  const { data } = await consulta.order("nombre", { ascending: true });
  return data ?? [];
}

export default async function DirectorioPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusqueda>;
}) {
  const params = await searchParams;
  const barberias = await buscarBarberias(params);
  const hayFiltrosActivos = Boolean(params.q || params.ciudad || params.zona || params.sello);

  return (
    <>
      <PlatformHeader />
      <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-3xl font-semibold text-gold">Directorio de barberías</h1>
      <p className="mb-6 text-muted">Encuentra una barbería certificada por Barbers Awards.</p>

      <div className="mb-8">
        <DirectorioFiltros />
      </div>

      {barberias.length === 0 ? (
        <div className="rounded border border-line bg-night p-8 text-center text-muted">
          <p>No encontramos barberías con esos criterios.</p>
          {hayFiltrosActivos ? <p className="mt-1 text-sm">Prueba limpiando los filtros.</p> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {barberias.map((barberia) => (
            <BarberiaCard key={barberia.id} barberia={barberia} />
          ))}
        </div>
      )}
      </main>
    </>
  );
}
