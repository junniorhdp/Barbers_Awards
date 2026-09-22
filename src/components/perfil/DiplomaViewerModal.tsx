"use client";

import { useEffect, useRef, useState } from "react";
import { publicStorageUrl } from "@/lib/storage";

// Modal accesible con el elemento nativo <dialog>: showModal() atrapa el
// foco y Esc cierra, sin necesitar Radix (ARCHITECTURE.md 2.4).
export function DiplomaViewerModal({
  diplomas,
  abierto,
  onCerrar,
}: {
  diplomas: string[];
  abierto: boolean;
  onCerrar: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [abierto]);

  if (diplomas.length === 0) return null;

  const actual = diplomas[indice];
  const esPdf = actual.toLowerCase().endsWith(".pdf");

  return (
    <dialog
      ref={dialogRef}
      onClose={onCerrar}
      className="diploma-modal"
    >
      <div className="diploma-modal-header">
        <span>
          Certificado {indice + 1} de {diplomas.length}
        </span>
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar">
          &times;
        </button>
      </div>
      <div className="diploma-modal-body">
        {esPdf ? (
          <object data={publicStorageUrl(actual)} type="application/pdf" aria-label="Diploma en PDF">
            <a href={publicStorageUrl(actual)} target="_blank" rel="noreferrer">
              Abrir diploma
            </a>
          </object>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicStorageUrl(actual)} alt={`Certificado ${indice + 1}`} />
        )}
      </div>
      {diplomas.length > 1 ? (
        <div className="diploma-modal-nav">
          <button type="button" disabled={indice === 0} onClick={() => setIndice((i) => i - 1)}>
            ← Anterior
          </button>
          <button
            type="button"
            disabled={indice === diplomas.length - 1}
            onClick={() => setIndice((i) => i + 1)}
          >
            Siguiente →
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
