import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/(auth)/actions";

const ENLACES = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/postulaciones", label: "Postulaciones" },
  { href: "/admin/certificaciones", label: "Certificaciones" },
  { href: "/admin/sellos", label: "Sellos" },
];

// Defensa en profundidad (ARCHITECTURE.md 3.3): src/proxy.ts ya redirige a
// /admin/login sin sesión ni rol administrator, pero la seguridad real vive
// aquí + en RLS, no en el middleware.
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "administrator") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-night">
      <nav className="flex flex-wrap gap-4 border-b border-line bg-carbon px-8 py-4">
        {ENLACES.map((enlace) => (
          <a key={enlace.href} href={enlace.href} className="text-sm text-muted hover:text-gold">
            {enlace.label}
          </a>
        ))}
        <form action={cerrarSesion} className="ml-auto">
          <input type="hidden" name="destino" value="/admin/login" />
          <button type="submit" className="text-sm text-muted hover:text-gold">
            Cerrar sesión
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
