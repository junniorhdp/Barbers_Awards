import { createClient } from "@/lib/supabase/server";
import { PerfilForm } from "@/components/dashboard/PerfilForm";
import { horariosVacios } from "@/lib/horarios";
import { esAcentoValido } from "@/lib/accent";
import { esLogoValido } from "@/lib/logo-presets";

export default async function DashboardPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: barberia } = await supabase
    .from("barberias")
    .select(
      "id, direccion, ciudad, zona, telefono_whatsapp, instagram_url, facebook_url, eslogan, descripcion, historia, anio_fundacion, color_acento, logo_preset, horarios, fotos",
    )
    .eq("owner_id", user!.id)
    .single();

  if (!barberia) {
    return <p className="p-8 text-red-400">No se encontró tu barbería.</p>;
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gold">Perfil de la barbería</h1>
      <PerfilForm
        barberia={{
          ...barberia,
          color_acento: esAcentoValido(barberia.color_acento) ? barberia.color_acento : "dorado",
          logo_preset: esLogoValido(barberia.logo_preset) ? barberia.logo_preset : "tijeras",
          horarios:
            barberia.horarios && Object.keys(barberia.horarios).length === 7
              ? barberia.horarios
              : horariosVacios(),
        }}
      />
    </main>
  );
}
