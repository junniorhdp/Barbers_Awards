// ARCHITECTURE.md 2.4: "Cifra grande en gold, etiqueta en muted." Sin filtro
// de rango (7/30 días): eso es CU-15 (métricas del dueño), fuera de esta fase.
export function MetricCard({ etiqueta, valor, nota }: { etiqueta: string; valor: string | number; nota?: string }) {
  return (
    <div className="rounded border border-line bg-night p-6">
      <p className="text-3xl font-semibold text-gold">{valor}</p>
      <p className="text-sm text-muted">{etiqueta}</p>
      {nota ? <p className="mt-1 text-xs text-muted">{nota}</p> : null}
    </div>
  );
}
