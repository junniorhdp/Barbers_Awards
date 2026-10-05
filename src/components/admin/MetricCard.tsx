// ARCHITECTURE.md 2.4: "Cifra grande en gold, etiqueta en muted." La usan
// CU-20 (admin) y CU-15 (dueño); el filtro de rango (7/30 días) de CU-15 vive
// en dashboard/page.tsx, no aquí.
export function MetricCard({ etiqueta, valor, nota }: { etiqueta: string; valor: string | number; nota?: string }) {
  return (
    <div className="rounded border border-line bg-night p-6">
      <p className="text-3xl font-semibold text-gold">{valor}</p>
      <p className="text-sm text-muted">{etiqueta}</p>
      {nota ? <p className="mt-1 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}
