"use client";

import { useState, useActionState } from "react";
import {
  actualizarPerfil,
  agregarFotos,
  quitarFoto,
  establecerPortada,
  quitarPortada,
  type FormState,
} from "@/app/dashboard/actions";
import { MAX_BYTES_PORTADA } from "@/lib/image-compression";
import { AccentPicker } from "./AccentPicker";
import { LogoPicker } from "./LogoPicker";
import { HorariosEditor } from "./HorariosEditor";
import { ImageUploader, urlPublicaStorage } from "./ImageUploader";
import type { Acento } from "@/lib/accent";
import type { LogoPreset } from "@/lib/logo-presets";
import type { Horarios } from "@/lib/horarios";

const estadoInicial: FormState = {};

type BarberiaPerfil = {
  id: string;
  direccion: string | null;
  ciudad: string;
  zona: string | null;
  telefono_whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  eslogan: string | null;
  descripcion: string | null;
  historia: string | null;
  anio_fundacion: number | null;
  color_acento: Acento;
  logo_preset: LogoPreset;
  horarios: Horarios;
  fotos: string[];
  foto_portada: string | null;
};

function Campo({
  id,
  label,
  type = "text",
  defaultValue,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  maxLength?: number;
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
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
    </div>
  );
}

function AreaTexto({
  id,
  label,
  defaultValue,
  maxLength,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={4}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
    </div>
  );
}

export function PerfilForm({ barberia }: { barberia: BarberiaPerfil }) {
  const [state, formAction, pending] = useActionState(actualizarPerfil, estadoInicial);
  const [fotos, setFotos] = useState(barberia.fotos);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [portada, setPortada] = useState(barberia.foto_portada);
  const [portadaError, setPortadaError] = useState<string | null>(null);

  async function manejarPortadaSubida(rutas: string[]) {
    const resultado = await establecerPortada(rutas[0]);
    if (resultado.error) {
      setPortadaError(resultado.error);
      return;
    }
    setPortadaError(null);
    setPortada(rutas[0]);
  }

  async function manejarQuitarPortada() {
    const resultado = await quitarPortada();
    if (resultado.error) {
      setPortadaError(resultado.error);
      return;
    }
    setPortadaError(null);
    setPortada(null);
  }

  async function manejarFotosSubidas(rutas: string[]) {
    const resultado = await agregarFotos(rutas);
    if (resultado.error) {
      setFotoError(resultado.error);
      return;
    }
    setFotoError(null);
    setFotos((prev) => [...prev, ...rutas]);
  }

  async function manejarQuitarFoto(ruta: string) {
    const resultado = await quitarFoto(ruta);
    if (resultado.error) {
      setFotoError(resultado.error);
      return;
    }
    setFotoError(null);
    setFotos((prev) => prev.filter((f) => f !== ruta));
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-4">
        <Campo id="direccion" label="Dirección" defaultValue={barberia.direccion ?? ""} />
        <Campo id="ciudad" label="Ciudad" defaultValue={barberia.ciudad} />
        <Campo id="zona" label="Zona / barrio" defaultValue={barberia.zona ?? ""} />
        <Campo
          id="telefonoWhatsapp"
          label="WhatsApp"
          type="tel"
          defaultValue={barberia.telefono_whatsapp ?? ""}
        />
        <Campo id="instagramUrl" label="Instagram (URL)" defaultValue={barberia.instagram_url ?? ""} />
        <Campo id="facebookUrl" label="Facebook (URL)" defaultValue={barberia.facebook_url ?? ""} />
        <Campo id="eslogan" label="Eslogan" defaultValue={barberia.eslogan ?? ""} maxLength={80} />
        <AreaTexto
          id="descripcion"
          label="Descripción corta"
          defaultValue={barberia.descripcion ?? ""}
          maxLength={500}
        />
        <AreaTexto
          id="historia"
          label="Historia del negocio"
          defaultValue={barberia.historia ?? ""}
          maxLength={2000}
        />
        <Campo
          id="anioFundacion"
          label="Año de fundación"
          type="number"
          defaultValue={barberia.anio_fundacion ?? ""}
        />

        <AccentPicker defaultValue={barberia.color_acento} />
        <LogoPicker defaultValue={barberia.logo_preset} />
        <HorariosEditor valorInicial={barberia.horarios} />

        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-violet-neon">Perfil guardado.</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-violet px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-gold">Foto de portada</h2>
        <p className="text-sm text-muted">
          Es la foto principal de tu perfil, la que se ve en grande. Por eso pedimos una foto horizontal de al
          menos 1600 × 900 px: una más pequeña se vería borrosa. Si no subes ninguna, se usa la primera foto de la
          galería.
        </p>
        {portada ? (
          <div className="flex flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlPublicaStorage(portada)}
              alt="Foto de portada"
              className="aspect-video w-full max-w-md rounded object-cover"
            />
            <button type="button" onClick={manejarQuitarPortada} className="w-fit text-xs text-red-400">
              Quitar portada
            </button>
          </div>
        ) : null}
        <ImageUploader
          barberiaId={barberia.id}
          carpeta="portada"
          etiqueta={portada ? "Reemplazar portada" : "Subir portada"}
          onSubido={manejarPortadaSubida}
          maxDim={2000}
          maxBytes={MAX_BYTES_PORTADA}
          minAncho={1600}
          minAlto={900}
          requiereHorizontal
        />
        {portadaError ? <p className="text-sm text-red-400">{portadaError}</p> : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-gold">Galería</h2>
        <ImageUploader
          barberiaId={barberia.id}
          carpeta="fotos"
          multiple
          etiqueta="Agregar fotos"
          onSubido={manejarFotosSubidas}
        />
        {fotoError ? <p className="text-sm text-red-400">{fotoError}</p> : null}
        <div className="grid grid-cols-3 gap-3">
          {fotos.map((ruta) => (
            <div key={ruta} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlPublicaStorage(ruta)}
                alt="Foto del local"
                className="aspect-square rounded object-cover"
              />
              <button
                type="button"
                onClick={() => manejarQuitarFoto(ruta)}
                className="text-xs text-red-400"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
