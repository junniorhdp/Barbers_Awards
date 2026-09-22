"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PerfilSchema, BarberoSchema, ServicioSchema } from "@/lib/validators";

export type FormState = { error?: string; success?: boolean };

const BUCKET = "barberias-storage";

async function contextoDueno() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const };

  const { data: barberia } = await supabase
    .from("barberias")
    .select("id, slug")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!barberia) return { error: "No se encontró tu barbería." as const };

  return { supabase, barberia };
}

function revalidarPerfil(slug: string, panel: string) {
  revalidatePath(`/barberia/${slug}`);
  revalidatePath(panel);
}

// --- Perfil (CU-09) -----------------------------------------------------

export async function actualizarPerfil(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const parsed = PerfilSchema.safeParse({
    direccion: formData.get("direccion") ?? "",
    ciudad: formData.get("ciudad") ?? "",
    zona: formData.get("zona") ?? "",
    telefonoWhatsapp: formData.get("telefonoWhatsapp") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    eslogan: formData.get("eslogan") ?? "",
    descripcion: formData.get("descripcion") ?? "",
    historia: formData.get("historia") ?? "",
    anioFundacion: formData.get("anioFundacion") ?? "",
    colorAcento: formData.get("colorAcento"),
    logoPreset: formData.get("logoPreset"),
    horarios: formData.get("horarios") ?? "{}",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase
    .from("barberias")
    .update({
      direccion: parsed.data.direccion,
      ciudad: parsed.data.ciudad,
      zona: parsed.data.zona,
      telefono_whatsapp: parsed.data.telefonoWhatsapp,
      instagram_url: parsed.data.instagramUrl,
      facebook_url: parsed.data.facebookUrl,
      eslogan: parsed.data.eslogan,
      descripcion: parsed.data.descripcion,
      historia: parsed.data.historia,
      anio_fundacion: parsed.data.anioFundacion,
      color_acento: parsed.data.colorAcento,
      logo_preset: parsed.data.logoPreset,
      horarios: parsed.data.horarios,
    })
    .eq("id", barberia.id);
  if (error) return { error: "No se pudo guardar el perfil. Intenta de nuevo." };

  revalidarPerfil(barberia.slug, "/dashboard/perfil");
  return { success: true };
}

export async function agregarFotos(rutas: string[]): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: actual } = await supabase
    .from("barberias")
    .select("fotos")
    .eq("id", barberia.id)
    .single();
  const fotos = [...(actual?.fotos ?? []), ...rutas];

  const { error } = await supabase.from("barberias").update({ fotos }).eq("id", barberia.id);
  if (error) return { error: "No se pudieron guardar las fotos." };

  revalidarPerfil(barberia.slug, "/dashboard/perfil");
  return { success: true };
}

export async function quitarFoto(ruta: string): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: actual } = await supabase
    .from("barberias")
    .select("fotos")
    .eq("id", barberia.id)
    .single();
  const fotos = (actual?.fotos ?? []).filter((f: string) => f !== ruta);

  const { error } = await supabase.from("barberias").update({ fotos }).eq("id", barberia.id);
  if (error) return { error: "No se pudo quitar la foto." };

  await supabase.storage.from(BUCKET).remove([ruta]);
  revalidarPerfil(barberia.slug, "/dashboard/perfil");
  return { success: true };
}

// --- Equipo (CU-10) -------------------------------------------------------

export async function crearBarbero(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const parsed = BarberoSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    experienciaAnos: formData.get("experienciaAnos") ?? "0",
    especialidades: formData.get("especialidades") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase.from("barberos").insert({
    barberia_id: barberia.id,
    nombre: parsed.data.nombre,
    experiencia_anos: parsed.data.experienciaAnos,
    especialidades: parsed.data.especialidades,
  });
  if (error) return { error: "No se pudo agregar el barbero." };

  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

export async function actualizarBarbero(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const barberoId = formData.get("barberoId");
  if (typeof barberoId !== "string") return { error: "Falta el barbero a editar." };

  const parsed = BarberoSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    experienciaAnos: formData.get("experienciaAnos") ?? "0",
    especialidades: formData.get("especialidades") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase
    .from("barberos")
    .update({
      nombre: parsed.data.nombre,
      experiencia_anos: parsed.data.experienciaAnos,
      especialidades: parsed.data.especialidades,
    })
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo actualizar el barbero." };

  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

export async function actualizarAvatarBarbero(barberoId: string, ruta: string): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: anterior } = await supabase
    .from("barberos")
    .select("foto_avatar")
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id)
    .maybeSingle();

  const { error } = await supabase
    .from("barberos")
    .update({ foto_avatar: ruta })
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo actualizar la foto." };

  if (anterior?.foto_avatar) {
    await supabase.storage.from(BUCKET).remove([anterior.foto_avatar]);
  }

  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

export async function agregarDiplomasBarbero(barberoId: string, rutas: string[]): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: actual } = await supabase
    .from("barberos")
    .select("diplomas_urls")
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id)
    .maybeSingle();

  const diplomas = [...(actual?.diplomas_urls ?? []), ...rutas];

  const { error } = await supabase
    .from("barberos")
    .update({ diplomas_urls: diplomas })
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudieron guardar los diplomas." };

  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

export async function quitarDiplomaBarbero(barberoId: string, ruta: string): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: actual } = await supabase
    .from("barberos")
    .select("diplomas_urls")
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id)
    .maybeSingle();

  const diplomas = (actual?.diplomas_urls ?? []).filter((d: string) => d !== ruta);

  const { error } = await supabase
    .from("barberos")
    .update({ diplomas_urls: diplomas })
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo quitar el diploma." };

  await supabase.storage.from(BUCKET).remove([ruta]);
  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

export async function eliminarBarbero(barberoId: string): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: barbero } = await supabase
    .from("barberos")
    .select("foto_avatar, diplomas_urls")
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id)
    .maybeSingle();

  const { error } = await supabase
    .from("barberos")
    .delete()
    .eq("id", barberoId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo eliminar el barbero." };

  const rutas = [
    ...(barbero?.foto_avatar ? [barbero.foto_avatar] : []),
    ...(barbero?.diplomas_urls ?? []),
  ];
  if (rutas.length > 0) {
    await supabase.storage.from(BUCKET).remove(rutas);
  }

  revalidarPerfil(barberia.slug, "/dashboard/equipo");
  return { success: true };
}

// --- Servicios (CU-11) ------------------------------------------------

export async function crearServicio(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const parsed = ServicioSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    descripcion: formData.get("descripcion") ?? "",
    precio: formData.get("precio") ?? "",
    duracionMin: formData.get("duracionMin") ?? "",
    icono: formData.get("icono") ?? "",
    destacado: formData.get("destacado") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { count } = await supabase
    .from("servicios")
    .select("id", { count: "exact", head: true })
    .eq("barberia_id", barberia.id);

  const { error } = await supabase.from("servicios").insert({
    barberia_id: barberia.id,
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion,
    precio: parsed.data.precio,
    duracion_min: parsed.data.duracionMin,
    icono: parsed.data.icono,
    destacado: parsed.data.destacado,
    orden: count ?? 0,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un servicio con ese nombre." : "No se pudo agregar el servicio.",
    };
  }

  revalidarPerfil(barberia.slug, "/dashboard/servicios");
  return { success: true };
}

export async function actualizarServicio(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const servicioId = formData.get("servicioId");
  if (typeof servicioId !== "string") return { error: "Falta el servicio a editar." };

  const parsed = ServicioSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    descripcion: formData.get("descripcion") ?? "",
    precio: formData.get("precio") ?? "",
    duracionMin: formData.get("duracionMin") ?? "",
    icono: formData.get("icono") ?? "",
    destacado: formData.get("destacado") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase
    .from("servicios")
    .update({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion,
      precio: parsed.data.precio,
      duracion_min: parsed.data.duracionMin,
      icono: parsed.data.icono,
      destacado: parsed.data.destacado,
    })
    .eq("id", servicioId)
    .eq("barberia_id", barberia.id);
  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un servicio con ese nombre." : "No se pudo actualizar el servicio.",
    };
  }

  revalidarPerfil(barberia.slug, "/dashboard/servicios");
  return { success: true };
}

export async function alternarActivoServicio(servicioId: string, activo: boolean): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { error } = await supabase
    .from("servicios")
    .update({ es_activo: activo })
    .eq("id", servicioId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo actualizar el servicio." };

  revalidarPerfil(barberia.slug, "/dashboard/servicios");
  return { success: true };
}

export async function eliminarServicio(servicioId: string): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { error } = await supabase
    .from("servicios")
    .delete()
    .eq("id", servicioId)
    .eq("barberia_id", barberia.id);
  if (error) return { error: "No se pudo eliminar el servicio." };

  revalidarPerfil(barberia.slug, "/dashboard/servicios");
  return { success: true };
}

export async function moverServicio(
  servicioId: string,
  direccion: "arriba" | "abajo",
): Promise<FormState> {
  const ctx = await contextoDueno();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, barberia } = ctx;

  const { data: servicios } = await supabase
    .from("servicios")
    .select("id, orden")
    .eq("barberia_id", barberia.id)
    .order("orden", { ascending: true });
  if (!servicios) return { error: "No se pudo reordenar." };

  const indice = servicios.findIndex((s) => s.id === servicioId);
  const vecino = direccion === "arriba" ? indice - 1 : indice + 1;
  if (indice === -1 || vecino < 0 || vecino >= servicios.length) return { success: true };

  const actual = servicios[indice];
  const otro = servicios[vecino];

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase.from("servicios").update({ orden: otro.orden }).eq("id", actual.id),
    supabase.from("servicios").update({ orden: actual.orden }).eq("id", otro.id),
  ]);
  if (error1 || error2) return { error: "No se pudo reordenar." };

  revalidarPerfil(barberia.slug, "/dashboard/servicios");
  return { success: true };
}
