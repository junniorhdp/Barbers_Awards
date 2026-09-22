import { Scissors, PocketKnife, MirrorRectangular, ScanFace, Sparkles, Eye, HandHeart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Mapeo de SERVICIO_ICONOS_SUGERIDOS (validators.ts) a íconos de lucide-react
// (ARCHITECTURE.md 3.7: "los emojis por íconos SVG, por ejemplo lucide-react").
// Ninguno es un calce perfecto porque lucide no trae íconos dedicados de
// navaja, peine o barba — son las aproximaciones más cercanas disponibles en
// lucide-react (verificadas contra la versión instalada).
// El campo icono del servicio no está limitado a las 8 sugerencias (solo el
// formato lo valida SCHEMA.sql): cualquier otra llave usa ICONO_SERVICIO_DEFECTO
// en vez de romper el render. Se exporta el mapa (no una función) para que
// ServiceCard resuelva el componente con un acceso directo — react-hooks no
// puede garantizar que el resultado de una llamada a función sea estable
// entre renders, pero sí lo hace con un acceso a un objeto constante.
export const ICONOS_SERVICIO: Record<string, LucideIcon> = {
  tijeras: Scissors,
  corte: Scissors,
  navaja: PocketKnife,
  peine: MirrorRectangular,
  barba: ScanFace,
  afeitado: Sparkles,
  cejas: Eye,
  masaje: HandHeart,
};

export const ICONO_SERVICIO_DEFECTO: LucideIcon = Scissors;
