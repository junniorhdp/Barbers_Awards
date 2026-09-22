"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/(auth)/actions";

const estadoInicial: FormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, estadoInicial);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="correo" className="text-sm text-muted">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          className="rounded border border-line bg-night px-3 py-2 text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="contrasena" className="text-sm text-muted">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-line bg-night px-3 py-2 text-ink"
        />
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-violet px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
