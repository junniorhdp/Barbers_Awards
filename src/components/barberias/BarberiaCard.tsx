import Link from "next/link";
import Image from "next/image";
import { publicStorageUrl } from "@/lib/storage";

type BarberiaResumen = {
  slug: string;
  nombre: string;
  ciudad: string;
  zona: string | null;
  fotos: string[];
  estado_sello: string;
};

function EstadoSelloTag({ estado }: { estado: string }) {
  if (estado === "gold") {
    return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">Sello Gold</span>;
  }
  if (estado === "silver") {
    return <span className="rounded-full bg-silver/15 px-2 py-0.5 text-xs font-medium text-silver">Sello Silver</span>;
  }
  return (
    <span className="rounded-full border border-violet-neon px-2 py-0.5 text-xs font-medium text-violet-neon">
      En verificación
    </span>
  );
}

// ARCHITECTURE.md 2.4: fondo night, borde dorado, destello violeta al pasar
// el cursor.
export function BarberiaCard({ barberia }: { barberia: BarberiaResumen }) {
  return (
    <Link
      href={`/barberia/${barberia.slug}`}
      className="group block overflow-hidden rounded-xl border border-gold/40 bg-night transition hover:border-gold hover:shadow-glow-violet"
    >
      <div className="relative aspect-video bg-carbon">
        {barberia.fotos[0] ? (
          <Image
            src={publicStorageUrl(barberia.fotos[0])}
            alt={barberia.nombre}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium text-ink">{barberia.nombre}</p>
          <p className="text-sm text-muted">
            {barberia.zona ? `${barberia.zona}, ` : ""}
            {barberia.ciudad}
          </p>
        </div>
        <EstadoSelloTag estado={barberia.estado_sello} />
      </div>
    </Link>
  );
}
