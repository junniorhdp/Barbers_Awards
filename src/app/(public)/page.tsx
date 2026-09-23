import Link from "next/link";
import { createClient } from "@/lib/supabase/public";
import { BarberiaCard } from "@/components/barberias/BarberiaCard";
import { PlatformHeader } from "@/components/ui/PlatformHeader";

type BarberiaDestacada = {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string;
  zona: string | null;
  fotos: string[];
  estado_sello: string;
};

type SeccionDestacadas = {
  titulo: string;
  barberias: BarberiaDestacada[];
};

// "Barberías destacadas" (CU-01): no existe una columna `destacado` en
// barberias. Regla aprobada: primero las Gold/Silver más recientemente
// certificadas ("Barberías Destacadas"); si todavía no hay ninguna (probable
// el día 1 del piloto), se completa con las más nuevas activas, pero bajo un
// título distinto ("Recién llegadas a la plataforma") — 'pendiente' significa
// sin auditar por el staff (CU-17), y llamarlas "destacadas" insinuaría una
// certificación que no existe.
async function obtenerDestacadas(): Promise<SeccionDestacadas> {
  const supabase = createClient();

  const { data: certificadas } = await supabase
    .from("certificaciones")
    .select("fecha_emision, barberias ( id, nombre, slug, ciudad, zona, fotos, estado_sello )")
    .eq("estado", "activo")
    .order("fecha_emision", { ascending: false })
    .limit(6);

  const destacadas = (certificadas ?? [])
    .map((c) => c.barberias as unknown as BarberiaDestacada | null)
    .filter((b): b is BarberiaDestacada => b !== null);

  if (destacadas.length > 0) {
    return { titulo: "Barberías destacadas", barberias: destacadas };
  }

  const { data: recientes } = await supabase
    .from("barberias")
    .select("id, nombre, slug, ciudad, zona, fotos, estado_sello")
    .neq("estado_sello", "inactivo")
    .order("created_at", { ascending: false })
    .limit(6);

  return { titulo: "Recién llegadas a la plataforma", barberias: recientes ?? [] };
}

export default async function HomePage() {
  const { titulo, barberias: destacadas } = await obtenerDestacadas();

  return (
    <>
      <PlatformHeader />
      <main>
      <section className="flex min-h-[80vh] flex-col items-center justify-center gap-6 bg-carbon px-8 text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-gold">
          Sello de calidad para barberías
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold text-ink sm:text-5xl">
          Encuentra barberías <span className="text-gold">certificadas</span> cerca de ti
        </h1>
        <p className="max-w-xl text-muted">
          Barbers Awards audita y certifica barberías para que sepas, antes de sentarte en la silla, que vas a
          salir bien atendido.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/directorio" className="rounded bg-violet px-6 py-3 font-medium text-white">
            Buscar una barbería
          </Link>
          <Link href="/registro" className="rounded border border-gold/60 px-6 py-3 font-medium text-gold">
            Registra tu barbería
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-gold">¿Qué garantiza el sello?</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded border border-line bg-night p-6 text-center">
            <p className="mb-2 text-lg font-medium text-ink">Auditado por el staff</p>
            <p className="text-sm text-muted">
              Cada barbería certificada fue revisada antes de recibir el sello Gold o Silver.
            </p>
          </div>
          <div className="rounded border border-line bg-night p-6 text-center">
            <p className="mb-2 text-lg font-medium text-ink">Verificable en público</p>
            <p className="text-sm text-muted">
              Cualquiera puede confirmar la vigencia de un sello con su folio, sin necesidad de cuenta.
            </p>
          </div>
          <div className="rounded border border-line bg-night p-6 text-center">
            <p className="mb-2 text-lg font-medium text-ink">Perfil completo</p>
            <p className="text-sm text-muted">
              Servicios, equipo, horarios y fotos reales de cada barbería, no una ficha genérica.
            </p>
          </div>
        </div>
      </section>

      {destacadas.length > 0 ? (
        <section className="mx-auto max-w-6xl px-8 pb-20">
          <h2 className="mb-8 text-center text-2xl font-semibold text-gold">{titulo}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destacadas.map((barberia) => (
              <BarberiaCard key={barberia.id} barberia={barberia} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/directorio" className="text-violet-neon underline">
              Ver todo el directorio →
            </Link>
          </div>
        </section>
      ) : null}
      </main>
    </>
  );
}
