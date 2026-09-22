import Link from "next/link";
import { oscurecer, colorTextoLegible } from "@/lib/color";

type Props =
  | { estado: "en-verificacion" }
  | { estado: "sello"; nombreSello: string; folio: string; colorHex: string | null; vencido: boolean };

const COLOR_POR_DEFECTO = "#D4AF37"; // gold, si catalogo_sellos.color_hex es nulo (2.4)

// El color de acento de la barbería (2.6) nunca toca este badge: el color
// del sello es siempre el de catalogo_sellos, o el default, sin importar
// color_acento (regla de negocio de CU-03).
export function SealBadge(props: Props) {
  if (props.estado === "en-verificacion") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-neon px-3 py-1 text-xs font-medium text-violet-neon">
        En verificación
      </span>
    );
  }

  const color = props.colorHex ?? COLOR_POR_DEFECTO;

  if (props.vencido) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted px-3 py-1 text-xs font-medium text-muted">
        Sello vencido
      </span>
    );
  }

  return (
    <Link
      href={`/verificar/${props.folio}`}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow"
      style={{
        background: `linear-gradient(135deg, ${color}, ${oscurecer(color)})`,
        color: colorTextoLegible(color),
      }}
    >
      {props.nombreSello}
    </Link>
  );
}
