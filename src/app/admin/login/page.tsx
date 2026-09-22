import { LoginForm } from "@/components/ui/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-night p-8">
      <h1 className="text-2xl font-semibold text-gold">Acceso staff</h1>
      <LoginForm />
    </main>
  );
}
