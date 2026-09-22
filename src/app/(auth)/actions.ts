"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginSchema, RegistroSchema } from "@/lib/validators";

export type FormState = { error?: string; requiereConfirmacion?: boolean };

function sanitizeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function redirectByRole(supabase: Awaited<ReturnType<typeof createClient>>): Promise<never> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "administrator") redirect("/admin");
  if (profile?.role === "barberia_owner") redirect("/dashboard");
  redirect("/");
}

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });
  if (!parsed.success) {
    return { error: "Ingresa un correo y una contraseña válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.correo,
    password: parsed.data.contrasena,
  });

  // CU-08, A1: mensaje genérico, sin indicar si el correo o la contraseña
  // fueron los incorrectos.
  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const next = sanitizeNext(formData.get("next"));
  if (next) redirect(next);

  return redirectByRole(supabase);
}

export async function registrarBarberia(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = RegistroSchema.safeParse({
    nombrePersonal: formData.get("nombrePersonal"),
    nombreBarberia: formData.get("nombreBarberia"),
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
    telefono: formData.get("telefono"),
    ciudad: formData.get("ciudad"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  const { nombrePersonal, nombreBarberia, correo, contrasena, telefono, ciudad } = parsed.data;

  // Paso 1 (ARCHITECTURE.md 3.6): signUp con el cliente de servidor. El
  // trigger handle_new_user() crea el perfil con role = barberia_owner.
  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: correo,
    password: contrasena,
    options: { data: { role: "barberia_owner", nombre: nombrePersonal } },
  });

  if (signUpError) {
    return {
      error: signUpError.message.toLowerCase().includes("already registered")
        ? "Ese correo ya está registrado."
        : "No se pudo crear la cuenta. Intenta de nuevo.",
    };
  }
  if (!signUpData.user) {
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  // Paso 2 y 3: slug único y alta de la barbería con el cliente admin
  // (service_role): con confirmación de correo activa, signUp no devuelve
  // sesión y un insert con el cliente normal fallaría por RLS.
  const admin = createAdminClient();
  const baseSlug = slugify(`${nombreBarberia}-${ciudad}`) || "barberia";
  let slug = baseSlug;
  let creada = false;

  for (let intento = 0; intento < 5 && !creada; intento++) {
    const { error: insertError } = await admin.from("barberias").insert({
      owner_id: signUpData.user.id,
      nombre: nombreBarberia,
      slug,
      ciudad,
      telefono_whatsapp: telefono,
    });

    if (!insertError) {
      creada = true;
      break;
    }
    if (insertError.code === "23505") {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }
    // Paso 4: si el insert falla por algo distinto a un slug repetido, se
    // borra el usuario recién creado para no dejar cuentas sin barbería.
    await admin.auth.admin.deleteUser(signUpData.user.id);
    return { error: "No se pudo registrar tu barbería. Intenta de nuevo." };
  }

  if (!creada) {
    await admin.auth.admin.deleteUser(signUpData.user.id);
    return { error: "No se pudo generar un identificador único para tu barbería. Intenta con otro nombre." };
  }

  // Con confirmación de correo activa (tu proyecto la tiene activa), signUp
  // no deja sesión: no hay nada a qué redirigir todavía.
  if (!signUpData.session) {
    return { requiereConfirmacion: true };
  }

  // Paso 5
  redirect("/dashboard");
}
