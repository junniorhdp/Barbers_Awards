"use client";

import { useState } from "react";
import Image from "next/image";
import { publicStorageUrl } from "@/lib/storage";
import { DiplomaViewerModal } from "./DiplomaViewerModal";

type Barbero = {
  id: string;
  nombre: string;
  foto_avatar: string | null;
  experiencia_anos: number;
  especialidades: string[];
  diplomas_urls: string[];
};

export function TeamCard({ barbero }: { barbero: Barbero }) {
  const [verDiplomas, setVerDiplomas] = useState(false);
  const [tokenApertura, setTokenApertura] = useState(0);

  return (
    <div className="team-card reveal">
      {barbero.foto_avatar ? (
        <Image
          src={publicStorageUrl(barbero.foto_avatar)}
          alt={barbero.nombre}
          width={88}
          height={88}
          className="team-avatar"
        />
      ) : (
        <div className="team-avatar team-avatar-placeholder" aria-hidden>
          {barbero.nombre.charAt(0).toUpperCase()}
        </div>
      )}
      <h3>{barbero.nombre}</h3>
      <p>{barbero.experiencia_anos} años de experiencia</p>
      {barbero.especialidades.length > 0 ? (
        <ul className="team-badges">
          {barbero.especialidades.map((especialidad) => (
            <li key={especialidad}>{especialidad}</li>
          ))}
        </ul>
      ) : null}
      {barbero.diplomas_urls.length > 0 ? (
        <button
          type="button"
          className="btn btn-outline-dark"
          onClick={() => {
            setTokenApertura((t) => t + 1);
            setVerDiplomas(true);
          }}
        >
          Ver Certificados
        </button>
      ) : null}
      <DiplomaViewerModal
        key={tokenApertura}
        diplomas={barbero.diplomas_urls}
        abierto={verDiplomas}
        onCerrar={() => setVerDiplomas(false)}
      />
    </div>
  );
}
