import { LOGO_ICONOS, type LogoPreset } from "@/lib/logo-presets";

// ARCHITECTURE.md 2.4 y 2.6: logo circular con degradado del acento
// (brand/brand-light/brand-dark, resueltos por perfil.css según data-accent)
// y el ícono del catálogo logo_preset, en on-brand.
export function LogoMark({ preset, tamano = 52 }: { preset: LogoPreset; tamano?: number }) {
  const Icono = LOGO_ICONOS[preset];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: tamano,
        height: tamano,
        background: "linear-gradient(135deg, var(--brand-light), var(--brand) 55%, var(--brand-dark))",
        color: "var(--on-brand)",
        boxShadow: "0 6px 10px rgba(0,0,0,.35)",
      }}
    >
      <Icono />
    </div>
  );
}
