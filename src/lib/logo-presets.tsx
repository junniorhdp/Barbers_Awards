// Catálogo de logos predefinidos (ARCHITECTURE.md 2.6). En el MVP no se suben
// logos propios (decisión 12): el dueño elige una de estas llaves. El
// degradado final con los tokens de acento (brand/brand-light/brand-dark) se
// aplica en el perfil público (Fase 4); aquí basta un ícono simple para elegir.
export const LOGO_PRESETS = ["tijeras", "navaja", "poste", "peine", "bigote", "brocha"] as const;

export type LogoPreset = (typeof LOGO_PRESETS)[number];

export function esLogoValido(valor: string): valor is LogoPreset {
  return (LOGO_PRESETS as readonly string[]).includes(valor);
}

export const LOGO_LABELS: Record<LogoPreset, string> = {
  tijeras: "Tijeras",
  navaja: "Navaja",
  poste: "Poste de barbería",
  peine: "Peine",
  bigote: "Bigote",
  brocha: "Brocha de afeitar",
};

function IconoTijeras() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <path d="M8 7.5 20 18M8 16.5 20 6" strokeLinecap="round" />
    </svg>
  );
}

function IconoNavaja() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M4 18 15 7a3 3 0 0 1 4 4L8 22z" />
      <path d="M15 7 18 4" strokeLinecap="round" />
    </svg>
  );
}

function IconoPoste() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <rect x="8" y="3" width="8" height="18" rx="4" />
      <path d="M8 7c2 2 6-2 8 0M8 12c2 2 6-2 8 0M8 17c2 2 6-2 8 0" strokeLinecap="round" />
    </svg>
  );
}

function IconoPeine() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <rect x="4" y="5" width="16" height="4" rx="1" />
      <path d="M6 9v10M10 9v10M14 9v10M18 9v10" strokeLinecap="round" />
    </svg>
  );
}

function IconoBigote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M2 14c2-4 6-5 10-5s8 1 10 5c-3-1-5 1-10 1s-7-2-10-1z" />
    </svg>
  );
}

function IconoBrocha() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M9 3h6v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" />
      <path d="M12 12v9" strokeLinecap="round" />
    </svg>
  );
}

export const LOGO_ICONOS: Record<LogoPreset, () => React.JSX.Element> = {
  tijeras: IconoTijeras,
  navaja: IconoNavaja,
  poste: IconoPoste,
  peine: IconoPeine,
  bigote: IconoBigote,
  brocha: IconoBrocha,
};
