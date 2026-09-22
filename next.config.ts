import type { NextConfig } from "next";

// ARCHITECTURE.md 2.5: autoriza el dominio de Supabase Storage para
// next/image. Se lee de NEXT_PUBLIC_SUPABASE_URL en vez de hardcodear el
// project-ref, para que funcione igual en desarrollo, preview y producción
// (proyectos de Supabase distintos, ver ARCHITECTURE.md 6.2).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
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
