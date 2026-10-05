import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/admin/MetricCard";

const RANGOS = [
  { valor: "7", label: "Últimos 7 días", dias: 7 },
  { valor: "30", label: "Últimos 30 días", dias: 30 },
  { valor: "todo", label: "Todo", dias: null },
] as const;

const inicioDelRango = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();

// CU-15. Todo sale de leads_whatsapp, sin tablas nuevas: "Visitas al perfil"
// no se mide todavía (decisión abierta 2 de ARCHITECTURE.md) y "Reservas con
// cupón" reemplaza a "Cupones copiados", porque copiar un código sin reservar
// no deja ningún registro.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoParam } = await searchParams;
  const rango = RANGOS.find((r) => r.valor === rangoParam) ?? RANGOS[2];

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

  const desde = rango.dias ? inicioDelRango(rango.dias) : null;

  // El rango filtra por la fecha en que se creó el lead: no existe una
  // columna con la fecha de la redención.
  const contarLeads = () => {
    const consulta = supabase
      .from("leads_whatsapp")
      .select("*", { count: "exact", head: true })
      .eq("barberia_id", barberia.id);
    return desde ? consulta.gte("creado_en", desde) : consulta;
  };

  const [{ count: leads }, { count: conCupon }, { count: redimidos }] = await Promise.all([
    contarLeads(),
    contarLeads().not("cupon_id", "is", null),
    contarLeads().not("cupon_id", "is", null).eq("conversion_exitosa", true),
  ]);

  const totalLeads = leads ?? 0;
  const totalConCupon = conCupon ?? 0;
  const totalRedimidos = redimidos ?? 0;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Métricas</h1>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Rango de fechas">
        {RANGOS.map((r) => (
          <Link
            key={r.valor}
            href={r.valor === "todo" ? "/dashboard" : `/dashboard?rango=${r.valor}`}
            aria-current={r.valor === rango.valor ? "page" : undefined}
            className={`rounded border px-3 py-1.5 text-sm ${
              r.valor === rango.valor ? "border-gold text-gold" : "border-line text-muted hover:text-gold"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard etiqueta="Clics a WhatsApp (leads)" valor={totalLeads} />
        <MetricCard etiqueta="Reservas con cupón" valor={totalConCupon} />
        <MetricCard
          etiqueta="Cupones redimidos en el local"
          valor={totalRedimidos}
          nota={
            totalConCupon > 0
              ? `${Math.round((totalRedimidos / totalConCupon) * 100)} % de las reservas con cupón`
              : undefined
          }
        />
        <MetricCard etiqueta="Visitas al perfil" valor="—" nota="Próximamente" />
      </div>

      {totalLeads === 0 ? (
        <p className="mt-6 max-w-2xl text-sm text-muted">
          {rango.dias
            ? "No hay reservas por WhatsApp en este periodo."
            : "Todavía no hay reservas por WhatsApp desde tu perfil. Cuando un cliente reserve, aparecerá aquí."}
        </p>
      ) : null}

      {rango.dias ? (
        <p className="mt-6 max-w-2xl text-xs text-muted">
          Las cifras cuentan las reservas hechas en este periodo. Un cupón redimido se suma en la fecha en que el
          cliente reservó, no en la fecha en que lo usó en el local.
        </p>
      ) : null}
    </main>
  );
}
