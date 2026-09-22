import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Reglas de ARCHITECTURE.md 3.3. Cada página protegida vuelve a verificar el
// rol con supabase.auth.getUser() (ver dashboard/layout.tsx y
// admin/(protected)/layout.tsx): esto solo evita el parpadeo de una página
// protegida antes del redirect.
export async function proxy(request: NextRequest) {
  const { response, user, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const esDashboard = pathname.startsWith("/dashboard");
  const esAdminProtegido = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const esAuthPublica = pathname === "/login" || pathname === "/registro" || pathname === "/admin/login";

  if (esDashboard && role !== "barberia_owner") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (esAdminProtegido && role !== "administrator") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (esAuthPublica && user) {
    const url = request.nextUrl.clone();
    url.pathname = role === "administrator" ? "/admin" : role === "barberia_owner" ? "/dashboard" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/registro"],
};
