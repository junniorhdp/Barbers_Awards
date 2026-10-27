import Link from "next/link";
import { colorSobreFondo } from "@/lib/color";
import { SelloMarca } from "./SelloMarca";

export type ReconocimientoVisible = {
  folio_verificacion: string;
  nombre_sello: string;
  color_hex: string | null;
};

const COLOR_POR_DEFECTO = "#D4AF37";
export const FONDO_TARJETA_SELLO = "#141416";

// Lista compacta de reconocimientos dentro de la tarjeta del sello (DESIGN.md
// 13.1): cada uno con su marca pequeña en el color de su propio sello (nunca
// el acento de la barbería) y enlazado a su folio. Envuelve en varias líneas;
// nunca hace scroll. Quién entra en la lista (solo los vigentes) lo decide
// quien la llama, con certificacionVigente().
export function ListaReconocimientos({ reconocimientos }: { reconocimientos: ReconocimientoVisible[] }) {
  return (
    <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
      {reconocimientos.map((reco) => (
        <li key={reco.folio_verificacion}>
          <Link
            href={`/verificar/${reco.folio_verificacion}`}
            className="inline-flex items-center gap-1.5 text-[13px] leading-tight text-ink hover:underline"
          >
            <SelloMarca
              color={colorSobreFondo(reco.color_hex ?? COLOR_POR_DEFECTO, FONDO_TARJETA_SELLO)}
              tamano={22}
              glifo="vigente"
              anillo={false}
            />
            {reco.nombre_sello}
          </Link>
        </li>
      ))}
    </ul>
  );
}
