export default async function VerificarFolioPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-gold">Verificación de sello</h1>
      <p className="text-muted">CU-04 — pendiente de implementación ({folio}).</p>
    </main>
  );
}
