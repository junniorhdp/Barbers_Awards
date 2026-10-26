"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generarFolio } from "@/lib/folio";
import { RechazoSchema, SelloSchema, CertificacionSchema } from "@/lib/validators";
import { certificacionVencida } from "@/lib/certificaciones";

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

// El índice único cuenta como "activa" también a una certificación vencida
// (no existe un estado 'vencido'), así que al chocar con él hay que decirle
// al staff cuál de los dos casos es (DESIGN.md 13.1).
async function mensajeCalidadOcupada(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barberiaId: string,
  accion: "asignar" | "reanudar",
): Promise<string> {
  const { data: activa } = await supabase
    .from("certificaciones")
    .select("fecha_vencimiento")
    .eq("barberia_id", barberiaId)
    .eq("categoria", "calidad")
    .eq("estado", "activo")
    .maybeSingle();
  if (activa && certificacionVencida(activa.fecha_vencimiento)) {
    return "Esta barbería tiene un nivel de calidad VENCIDO. Usa \"Renovar\" para cerrarlo y emitir el nuevo.";
  }
  return accion === "asignar"
    ? "Esta barbería ya tiene un nivel de calidad VIGENTE. Revócalo o pausa el actual antes de asignar uno nuevo."
    : "Esta barbería ya tiene un nivel de calidad VIGENTE. Revócalo o pausa el actual antes de reanudar este.";
}

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

  // Renovar: cierra la certificación de calidad vencida y emite la nueva en
  // el mismo envío. Se cierra al confirmar, no al abrir el formulario: si el
  // staff cancela, no cambia nada. Queda en 'revocado' porque es el único
  // estado terminal que existe hoy (DESIGN.md 13.1).
  const renovarId = formData.get("renovarId");
  if (typeof renovarId === "string" && renovarId !== "") {
    if (!esCalidad) return { error: "Solo se renueva un nivel de calidad. Elige un sello Gold o Silver." };
    const { data: vencida } = await supabase
      .from("certificaciones")
      .select("barberia_id, categoria, estado, fecha_vencimiento")
      .eq("id", renovarId)
      .maybeSingle();
    if (
      !vencida ||
      vencida.barberia_id !== parsed.data.barberiaId ||
      vencida.categoria !== "calidad" ||
      vencida.estado !== "activo" ||
      !certificacionVencida(vencida.fecha_vencimiento)
    ) {
      return { error: "La certificación a renovar ya no está activa y vencida. Recarga la página." };
    }
    const { error: errorCierre } = await supabase
      .from("certificaciones")
      .update({ estado: "revocado" })
      .eq("id", renovarId)
      .eq("estado", "activo");
    if (errorCierre) return { error: "No se pudo cerrar la certificación vencida." };
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
    if (insertado.error.code === "23505" && esCalidad) {
      return { error: await mensajeCalidadOcupada(supabase, parsed.data.barberiaId, "asignar") };
    }
    return {
      error:
        insertado.error.code === "23505"
          ? "No se pudo generar un folio único. Intenta de nuevo."
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

// Pausar es reversible; revocar no. Devuelve a 'activo' una certificación
// pausada ('pendiente') y, si es de calidad, restaura estado_sello a su
// nivel. Sin esto, la única salida de una pausa era emitir otra con folio
// nuevo, dejando la vieja huérfana en 'pendiente' (DESIGN.md 13.1).
export async function reanudarCertificacion(certificacionId: string): Promise<FormState> {
  const ctx = await contextoAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: certificacion } = await supabase
    .from("certificaciones")
    .select("id, estado, categoria, barberia_id, barberias ( slug ), catalogo_sellos ( nivel )")
    .eq("id", certificacionId)
    .maybeSingle();
  if (!certificacion) return { error: "La certificación ya no existe." };
  if (certificacion.estado !== "pendiente") {
    return { error: "Solo se puede reanudar una certificación pausada. Una revocada no se reanuda: emite una nueva." };
  }

  const esCalidad = certificacion.categoria === "calidad";
  if (esCalidad) {
    // Solo la más reciente: reanudar una pausada antigua dejaría el sello
    // activo detrás de otra certificación más nueva, y la etiqueta (que mira
    // la más reciente) no lo mostraría.
    const { data: masReciente } = await supabase
      .from("certificaciones")
      .select("id")
      .eq("barberia_id", certificacion.barberia_id)
      .eq("categoria", "calidad")
      .order("fecha_emision", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (masReciente?.id !== certificacion.id) {
      return { error: "Solo se puede reanudar la certificación de calidad más reciente de la barbería." };
    }
  }

  const { error } = await supabase.from("certificaciones").update({ estado: "activo" }).eq("id", certificacionId);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? await mensajeCalidadOcupada(supabase, certificacion.barberia_id, "reanudar")
          : "No se pudo reanudar la certificación.",
    };
  }

  if (esCalidad) {
    const sello = certificacion.catalogo_sellos as unknown as { nivel: string | null } | null;
    const nivel = (sello?.nivel ?? "").toLowerCase();
    if (nivel === "gold" || nivel === "silver") {
      await supabase.from("barberias").update({ estado_sello: nivel }).eq("id", certificacion.barberia_id);
    }
  }

  const barberia = certificacion.barberias as unknown as { slug: string } | null;
  revalidarPublico(barberia?.slug);
  revalidatePath("/admin/certificaciones");
  return { success: true };
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
