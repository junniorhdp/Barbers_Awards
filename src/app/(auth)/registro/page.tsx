import { RegistroForm } from "@/components/ui/RegistroForm";

export default function RegistroPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold text-gold">Registro de barbería</h1>
      <RegistroForm />
      <p className="text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="text-violet-neon underline">
          Inicia sesión
        </a>
      </p>
    </main>
  );
}
