import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return <div className="min-h-screen bg-night">{children}</div>;
}
