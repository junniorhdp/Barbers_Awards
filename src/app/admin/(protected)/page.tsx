import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/admin/MetricCard";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: totalBarberias },
    { count: aprobadas },
    { count: pendientes },
    { count: rechazadas },
    { count: totalLeads },
    { data: cupones },
    { data: pagos },
  ] = await Promise.all([
    supabase.from("barberias").select("*", { count: "exact", head: true }),
    supabase.from("barberias").select("*", { count: "exact", head: true }).eq("estado_postulacion", "aprobada"),
    supabase.from("barberias").select("*", { count: "exact", head: true }).eq("estado_postulacion", "pendiente"),
    supabase.from("barberias").select("*", { count: "exact", head: true }).eq("estado_postulacion", "rechazada"),
    supabase.from("leads_whatsapp").select("*", { count: "exact", head: true }),
    supabase.from("cupones_descuento").select("veces_redimido"),
    supabase.from("transacciones_pago").select("estado, monto"),
  ]);

  const cuponesRedimidos = (cupones ?? []).reduce((total, c) => total + c.veces_redimido, 0);
  const pagosAprobados = (pagos ?? []).filter((p) => p.estado === "APPROVED");
  const ingresosAprobados = pagosAprobados.reduce((total, p) => total + Number(p.monto), 0);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Métricas globales</h1>
      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard etiqueta="Barberías registradas" valor={totalBarberias ?? 0} />
        <MetricCard etiqueta="Aprobadas" valor={aprobadas ?? 0} nota={`${pendientes ?? 0} pendientes de revisión`} />
        <MetricCard etiqueta="Rechazadas" valor={rechazadas ?? 0} />
        <MetricCard etiqueta="Clics a WhatsApp (leads)" valor={totalLeads ?? 0} />
        <MetricCard etiqueta="Cupones redimidos en el local" valor={cuponesRedimidos} />
        {(pagos ?? []).length === 0 ? (
          <MetricCard etiqueta="Pagos procesados (Wompi)" valor="—" nota="Sin pagos registrados aún" />
        ) : (
          <MetricCard
            etiqueta="Pagos aprobados (Wompi)"
            valor={pagosAprobados.length}
            nota={`${formatoCOP.format(ingresosAprobados)} en ingresos`}
          />
        )}
      </div>
    </main>
  );
}
