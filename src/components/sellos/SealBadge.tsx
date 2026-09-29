import Link from "next/link";
import { oscurecer, colorTextoLegible } from "@/lib/color";

type Props =
  | { estado: "en-verificacion" }
  | { estado: "no-vigente" }
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

  // ARCHITECTURE.md, decisión 8: si la suscripción no está vigente, el
  // perfil sigue visible pero el sello de calidad deja de mostrarse como
  // Gold/Silver/En Verificación — sin relación con el estado real del
  // sello (CU-18), que el staff no toca por un pago vencido.
  if (props.estado === "no-vigente") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-muted px-3 py-1 text-xs font-medium text-muted">
        Sello no vigente
      </span>
    );
  }

  const color = props.colorHex ?? COLOR_POR_DEFECTO;
  const colorOscuro = oscurecer(color);

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
      className="seal-reveal inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold tracking-wide sm:text-base"
      style={{
        background: `linear-gradient(135deg, ${color}, ${colorOscuro})`,
        color: colorTextoLegible(color, colorOscuro),
        boxShadow: `0 10px 28px -6px color-mix(in srgb, ${color} 65%, transparent), 0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      {props.nombreSello}
    </Link>
  );
}
