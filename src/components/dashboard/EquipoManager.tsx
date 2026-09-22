"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  crearBarbero,
  actualizarBarbero,
  actualizarAvatarBarbero,
  agregarDiplomasBarbero,
  quitarDiplomaBarbero,
  eliminarBarbero,
  type FormState,
} from "@/app/dashboard/actions";
import { ImageUploader, urlPublicaStorage } from "./ImageUploader";

const estadoInicial: FormState = {};

type Barbero = {
  id: string;
  nombre: string;
  foto_avatar: string | null;
  experiencia_anos: number;
  especialidades: string[];
  diplomas_urls: string[];
};

function FormularioBarbero({
  barbero,
  onGuardado,
}: {
  barbero?: Barbero;
  onGuardado: () => void;
}) {
  const accion = barbero ? actualizarBarbero : crearBarbero;
  const [state, formAction, pending] = useActionState(accion, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onGuardado();
      if (!barbero) formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-line bg-night p-4"
    >
      {barbero ? <input type="hidden" name="barberoId" value={barbero.id} /> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm text-muted">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          defaultValue={barbero?.nombre ?? ""}
          required
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="experienciaAnos" className="text-sm text-muted">
          Años de experiencia
        </label>
        <input
          id="experienciaAnos"
          name="experienciaAnos"
          type="number"
          min={0}
          defaultValue={barbero?.experiencia_anos ?? 0}
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="especialidades" className="text-sm text-muted">
          Especialidades (separadas por coma)
        </label>
        <input
          id="especialidades"
          name="especialidades"
          defaultValue={barbero?.especialidades.join(", ") ?? ""}
          placeholder="Fade, barba, diseño"
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando..." : barbero ? "Guardar cambios" : "Agregar barbero"}
      </button>
    </form>
  );
}

function PanelMultimedia({ barberiaId, barbero }: { barberiaId: string; barbero: Barbero }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function subirAvatar(rutas: string[]) {
    const ruta = rutas[0];
    if (!ruta) return;
    const resultado = await actualizarAvatarBarbero(barbero.id, ruta);
    if (resultado.error) return setError(resultado.error);
    setError(null);
    router.refresh();
  }

  async function subirDiplomas(rutas: string[]) {
    const resultado = await agregarDiplomasBarbero(barbero.id, rutas);
    if (resultado.error) return setError(resultado.error);
    setError(null);
    router.refresh();
  }

  async function quitarDiploma(ruta: string) {
    const resultado = await quitarDiplomaBarbero(barbero.id, ruta);
    if (resultado.error) return setError(resultado.error);
    setError(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      {barbero.foto_avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlPublicaStorage(barbero.foto_avatar)}
          alt={barbero.nombre}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : null}
      <ImageUploader
        barberiaId={barberiaId}
        carpeta={`barberos/${barbero.id}`}
        etiqueta="Foto de perfil"
        onSubido={subirAvatar}
      />

      <ImageUploader
        barberiaId={barberiaId}
        carpeta={`barberos/${barbero.id}`}
        accept="application/pdf,image/*"
        multiple
        etiqueta="Diplomas / certificados"
        onSubido={subirDiplomas}
      />
      <ul className="flex flex-col gap-1">
        {barbero.diplomas_urls.map((ruta) => (
          <li key={ruta} className="flex items-center justify-between text-sm text-ink">
            <a href={urlPublicaStorage(ruta)} target="_blank" rel="noreferrer" className="underline">
              {ruta.split("/").pop()}
            </a>
            <button type="button" onClick={() => quitarDiploma(ruta)} className="text-xs text-red-400">
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export function EquipoManager({
  barberiaId,
  barberosIniciales,
}: {
  barberiaId: string;
  barberosIniciales: Barbero[];
}) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function confirmarEliminar(barberoId: string) {
    const resultado = await eliminarBarbero(barberoId);
    setConfirmandoId(null);
    if (!resultado.error) router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Agregar barbero</h2>
        <FormularioBarbero onGuardado={() => router.refresh()} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Equipo actual</h2>
        {barberosIniciales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has agregado barberos.</p>
        ) : null}
        {barberosIniciales.map((barbero) => (
          <div key={barbero.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{barbero.nombre}</p>
                <p className="text-sm text-muted">
                  {barbero.experiencia_anos} años · {barbero.especialidades.join(", ") || "sin especialidades"}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setEditandoId(editandoId === barbero.id ? null : barbero.id)}
                  className="text-violet-neon underline"
                >
                  {editandoId === barbero.id ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoId(barbero.id)}
                  className="text-red-400 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {confirmandoId === barbero.id ? (
              <div className="flex items-center gap-3 rounded border border-red-400/40 bg-carbon p-3 text-sm">
                <span>¿Eliminar a {barbero.nombre} y sus documentos? Esta acción no se puede deshacer.</span>
                <button
                  type="button"
                  onClick={() => confirmarEliminar(barbero.id)}
                  className="rounded bg-red-500 px-3 py-1 text-white"
                >
                  Sí, eliminar
                </button>
                <button type="button" onClick={() => setConfirmandoId(null)} className="text-muted">
                  Cancelar
                </button>
              </div>
            ) : null}

            {editandoId === barbero.id ? (
              <div className="flex flex-col gap-4">
                <FormularioBarbero barbero={barbero} onGuardado={() => router.refresh()} />
                <PanelMultimedia barberiaId={barberiaId} barbero={barbero} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
