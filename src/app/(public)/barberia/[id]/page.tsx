export default async function PerfilBarberiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-gold">Perfil de barbería</h1>
      <p className="text-muted">CU-03 — pendiente de implementación ({id}).</p>
    </main>
  );
}
