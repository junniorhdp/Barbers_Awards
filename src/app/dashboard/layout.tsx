import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ENLACES = [
  { href: "/dashboard", label: "Métricas" },
  { href: "/dashboard/perfil", label: "Perfil" },
  { href: "/dashboard/equipo", label: "Equipo" },
  { href: "/dashboard/servicios", label: "Servicios" },
  { href: "/dashboard/cupones", label: "Cupones" },
  { href: "/dashboard/checkout", label: "Suscripción" },
];

// Defensa en profundidad (ARCHITECTURE.md 3.3): src/proxy.ts ya redirige a
// /login sin sesión ni rol barberia_owner, pero la seguridad real vive
// aquí + en RLS, no en el middleware.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "barberia_owner") redirect("/login");

  return (
    <div className="min-h-screen bg-night">
      <nav className="flex flex-wrap gap-4 border-b border-line bg-carbon px-8 py-4">
        {ENLACES.map((enlace) => (
          <a key={enlace.href} href={enlace.href} className="text-sm text-muted hover:text-gold">
            {enlace.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
