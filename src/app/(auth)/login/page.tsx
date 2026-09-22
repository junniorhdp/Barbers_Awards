import { LoginForm } from "@/components/ui/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold text-gold">Iniciar sesión</h1>
      <LoginForm next={next} />
      <p className="text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <a href="/registro" className="text-violet-neon underline">
          Registra tu barbería
        </a>
      </p>
    </main>
  );
}
