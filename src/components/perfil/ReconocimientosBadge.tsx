"use client";

import { useRef } from "react";
import Link from "next/link";

type Reconocimiento = {
  folio_verificacion: string;
  fecha_emision: string;
  nombre_sello: string;
};

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });

// "+N más" junto al SealBadge de calidad: agrupa las certificaciones
// adicionales (categoria = 'reconocimiento', CU-18/CU-19) sin competir con
// el nivel de calidad. Cada una enlaza a /verificar/[folio], que ya existe
// — sin QR ni sistema de verificación nuevo. Mismo patrón de <dialog> que
// DiplomaViewerModal.
export function ReconocimientosBadge({ reconocimientos }: { reconocimientos: Reconocimiento[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (reconocimientos.length === 0) return null;

  return (
    <>
      <button type="button" className="reco-chip" onClick={() => dialogRef.current?.showModal()}>
        +{reconocimientos.length} más
      </button>
      <dialog ref={dialogRef} className="reco-modal">
        <div className="reco-modal-header">
          <span>Certificaciones adicionales</span>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar">
            &times;
          </button>
        </div>
        <ul className="reco-modal-list">
          {reconocimientos.map((reco) => (
            <li key={reco.folio_verificacion}>
              <div>
                <p className="reco-modal-nombre">{reco.nombre_sello}</p>
                <p className="reco-modal-fecha">
                  Emitido el {FORMATTER_FECHA.format(new Date(reco.fecha_emision))}
                </p>
              </div>
              <Link href={`/verificar/${reco.folio_verificacion}`}>Verificar</Link>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
