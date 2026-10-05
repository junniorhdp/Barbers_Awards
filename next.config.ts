import type { NextConfig } from "next";

// ARCHITECTURE.md 2.5: autoriza el dominio de Supabase Storage para
// next/image. Se lee de NEXT_PUBLIC_SUPABASE_URL en vez de hardcodear el
// project-ref, para que funcione igual en desarrollo, preview y producción
// (proyectos de Supabase distintos, ver ARCHITECTURE.md 6.2).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// ARCHITECTURE.md 4.1.6: para probar Wompi en local la app se sirve por un
// túnel HTTPS (NEXT_PUBLIC_APP_URL apunta al túnel). Next bloquea en
// desarrollo las peticiones que llegan desde un host distinto a localhost,
// así que se autoriza ese host. Solo afecta a `next dev`.
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const appHostname = appUrl ? new URL(appUrl).hostname : undefined;
const esHostLocal = appHostname === "localhost" || appHostname === "127.0.0.1";

const nextConfig: NextConfig = {
  allowedDevOrigins: appHostname && !esHostLocal ? [appHostname] : [],
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/barberias-storage/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
