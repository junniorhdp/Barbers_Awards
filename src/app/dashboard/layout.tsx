import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return <div className="min-h-screen bg-night">{children}</div>;
}
