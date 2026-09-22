"use client";

import { useActionState } from "react";
import { registrarBarberia, type FormState } from "@/app/(auth)/actions";

const estadoInicial: FormState = {};

function Campo({
  id,
  label,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
    </div>
  );
}

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(registrarBarberia, estadoInicial);

  if (state.requiereConfirmacion) {
    return (
      <p className="max-w-sm text-ink">
        Creamos tu cuenta. Revisa tu correo y confirma tu cuenta antes de iniciar sesión en{" "}
        <a href="/login" className="text-violet-neon underline">
          /login
        </a>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <Campo id="nombrePersonal" label="Tu nombre" type="text" autoComplete="name" />
      <Campo id="nombreBarberia" label="Nombre del establecimiento" type="text" />
      <Campo id="correo" label="Correo" type="email" autoComplete="email" />
      <Campo id="contrasena" label="Contraseña" type="password" autoComplete="new-password" />
      <Campo id="telefono" label="Teléfono (WhatsApp)" type="tel" autoComplete="tel" />
      <Campo id="ciudad" label="Ciudad" type="text" />

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-violet px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
