import Link from "next/link";
import { SelloMarca } from "./SelloMarca";

export type ReconocimientoVisible = {
  folio_verificacion: string;
  nombre_sello: string;
};

// Lista compacta de reconocimientos dentro de la tarjeta del sello (DESIGN.md
// 8.4): todos se pintan igual, con la marca en contorno del mismo color
// neutro que su nombre (currentColor = text-ink). Sin color por
// reconocimiento: el color ya significa algo en el sistema (dorado es Gold,
// plata es Silver), y teñir uno haría que valiera más que los otros. La marca
// rellena queda reservada al nivel de calidad. Envuelve en varias líneas;
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
            <SelloMarca color="currentColor" tamano={22} glifo="vigente" anillo={false} />
            {reco.nombre_sello}
          </Link>
        </li>
      ))}
    </ul>
  );
}
