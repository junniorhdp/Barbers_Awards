"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generarFolio } from "@/lib/folio";
import { RechazoSchema, SelloSchema, CertificacionSchema } from "@/lib/validators";

export type FormState = { error?: string; success?: boolean };

async function contextoAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "administrator") return { error: "No autorizado." as const };

  return { supabase };
}

function revalidarPublico(slug?: string | null) {
  revalidatePath("/");
  if (slug) revalidatePath(`/barberia/${slug}`);
}

// --- Postulaciones (CU-17) -----------------------------------------------

export async function aprobarPostulacion(barberiaId: string): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: barberia, error } = await supabase
    .from("barberias")
    .update({ estado_postulacion: "aprobada", motivo_rechazo: null })
    .eq("id", barberiaId)
    .select("slug")
    .single();
  if (error) return { error: "No se pudo aprobar la postulación." };

  revalidarPublico(barberia?.slug);
  revalidatePath("/admin/postulaciones");
  return { success: true };
}

export async function rechazarPostulacion(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const barberiaId = formData.get("barberiaId");
  if (typeof barberiaId !== "string") return { error: "Falta la barbería a rechazar." };

  const parsed = RechazoSchema.safeParse({ motivoRechazo: formData.get("motivoRechazo") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el motivo." };
  }

  const { error } = await supabase
    .from("barberias")
    .update({ estado_postulacion: "rechazada", motivo_rechazo: parsed.data.motivoRechazo })
    .eq("id", barberiaId);
  if (error) return { error: "No se pudo rechazar la postulación." };

  revalidatePath("/admin/postulaciones");
  return { success: true };
}

// --- Certificaciones (CU-18) ----------------------------------------------

export async function emitirCertificacion(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const parsed = CertificacionSchema.safeParse({
    barberiaId: formData.get("barberiaId"),
    selloId: formData.get("selloId"),
    fechaVencimiento: formData.get("fechaVencimiento") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { data: sello } = await supabase
    .from("catalogo_sellos")
    .select("nivel, categoria")
    .eq("id", parsed.data.selloId)
    .maybeSingle();
  if (!sello) return { error: "El sello elegido ya no existe." };

  // Solo 'calidad' es excluyente y toca barberias.estado_sello; un
  // 'reconocimiento' (ej. "Bioseguridad") se acumula sin límite y nunca lo
  // toca (ver SCHEMA.sql v1.6).
  const esCalidad = sello.categoria === "calidad";
  const nivelEstadoSello = (sello.nivel ?? "").toLowerCase();
  if (esCalidad && nivelEstadoSello !== "gold" && nivelEstadoSello !== "silver") {
    return { error: "Este sello no se puede asignar: su nivel no es Gold ni Silver." };
  }

  // Reintenta si el folio choca con uno existente (ARCHITECTURE.md 3.6).
  let insertado: { error: { code?: string } | null } = { error: null };
  for (let intento = 0; intento < 5; intento++) {
    const folio = generarFolio();
    const resultado = await supabase.from("certificaciones").insert({
      barberia_id: parsed.data.barberiaId,
      sello_id: parsed.data.selloId,
      categoria: sello.categoria,
      folio_verificacion: folio,
      estado: "activo",
      fecha_vencimiento: parsed.data.fechaVencimiento,
    });
    insertado = resultado;
    if (!resultado.error || resultado.error.code !== "23505") break;
  }
  if (insertado.error) {
    return {
      error:
        insertado.error.code === "23505"
          ? esCalidad
            ? "Esta barbería ya tiene un nivel de calidad activo. Revócalo o pausa el actual antes de asignar uno nuevo."
            : "No se pudo generar un folio único. Intenta de nuevo."
          : "No se pudo emitir la certificación.",
    };
  }

  let slug: string | null = null;
  if (esCalidad) {
    const { data: barberia, error: errorUpdate } = await supabase
      .from("barberias")
      .update({ estado_sello: nivelEstadoSello })
      .eq("id", parsed.data.barberiaId)
      .select("slug")
      .single();
    if (errorUpdate) return { error: "El sello se emitió, pero no se pudo actualizar la barbería." };
    slug = barberia?.slug ?? null;
  } else {
    const { data: barberia } = await supabase
      .from("barberias")
      .select("slug")
      .eq("id", parsed.data.barberiaId)
      .maybeSingle();
    slug = barberia?.slug ?? null;
  }

  revalidarPublico(slug);
  revalidatePath("/admin/certificaciones");
  return { success: true };
}

async function cambiarEstadoCertificacion(certificacionId: string, nuevoEstado: "pendiente" | "revocado") {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: certificacion } = await supabase
    .from("certificaciones")
    .select("estado, categoria, barberia_id, barberias ( slug )")
    .eq("id", certificacionId)
    .maybeSingle();
  if (!certificacion) return { error: "La certificación ya no existe." };

  const { error } = await supabase
    .from("certificaciones")
    .update({ estado: nuevoEstado })
    .eq("id", certificacionId);
  if (error) return { error: "No se pudo actualizar la certificación." };

  // Si era el nivel de calidad activo, vuelve a "En Verificación": ya no hay
  // un Gold/Silver vigente. Un reconocimiento pausado/revocado no toca
  // estado_sello — nunca lo tocó al emitirse tampoco.
  if (certificacion.estado === "activo" && certificacion.categoria === "calidad") {
    await supabase.from("barberias").update({ estado_sello: "pendiente" }).eq("id", certificacion.barberia_id);
  }

  const barberia = certificacion.barberias as unknown as { slug: string } | null;
  revalidarPublico(barberia?.slug);
  revalidatePath("/admin/certificaciones");
  return { success: true };
}

export async function pausarCertificacion(certificacionId: string): Promise<FormState> {
  return cambiarEstadoCertificacion(certificacionId, "pendiente");
}

export async function revocarCertificacion(certificacionId: string): Promise<FormState> {
  return cambiarEstadoCertificacion(certificacionId, "revocado");
}

// --- Catálogo de sellos (CU-19) --------------------------------------------

function errorSelloAmigable(error: { code?: string } | null): string {
  if (error?.code === "23505") return "Ya existe un sello con ese nombre.";
  if (error?.code === "23503") {
    return "No se puede eliminar: existen certificaciones (activas o históricas) que usan este sello.";
  }
  return "No se pudo guardar el sello.";
}

export async function crearSello(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const parsed = SelloSchema.safeParse({
    nombreSello: formData.get("nombreSello") ?? "",
    categoria: formData.get("categoria"),
    nivel: formData.get("nivel") ?? "",
    requisitos: formData.get("requisitos") ?? "",
    entidadEmisora: formData.get("entidadEmisora") ?? "",
    colorHex: formData.get("colorHex") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase.from("catalogo_sellos").insert({
    nombre_sello: parsed.data.nombreSello,
    categoria: parsed.data.categoria,
    nivel: parsed.data.nivel,
    requisitos: parsed.data.requisitos,
    entidad_emisora: parsed.data.entidadEmisora,
    color_hex: parsed.data.colorHex,
  });
  if (error) return { error: errorSelloAmigable(error) };

  revalidatePath("/admin/sellos");
  return { success: true };
}

export async function actualizarSello(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const selloId = formData.get("selloId");
  if (typeof selloId !== "string") return { error: "Falta el sello a editar." };

  const parsed = SelloSchema.safeParse({
    nombreSello: formData.get("nombreSello") ?? "",
    categoria: formData.get("categoria"),
    nivel: formData.get("nivel") ?? "",
    requisitos: formData.get("requisitos") ?? "",
    entidadEmisora: formData.get("entidadEmisora") ?? "",
    colorHex: formData.get("colorHex") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const { error } = await supabase
    .from("catalogo_sellos")
    .update({
      nombre_sello: parsed.data.nombreSello,
      categoria: parsed.data.categoria,
      nivel: parsed.data.nivel,
      requisitos: parsed.data.requisitos,
      entidad_emisora: parsed.data.entidadEmisora,
      color_hex: parsed.data.colorHex,
    })
    .eq("id", selloId);
  if (error) return { error: errorSelloAmigable(error) };

  revalidatePath("/admin/sellos");
  revalidatePath("/"); // color_hex/nombre alimentan SealBadge en perfiles públicos
  return { success: true };
}

export async function eliminarSello(selloId: string): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { error } = await supabase.from("catalogo_sellos").delete().eq("id", selloId);
  if (error) return { error: errorSelloAmigable(error) };

  revalidatePath("/admin/sellos");
  return { success: true };
}
