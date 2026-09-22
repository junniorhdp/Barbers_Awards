"use client";

import { LOGO_PRESETS, LOGO_LABELS, LOGO_ICONOS, type LogoPreset } from "@/lib/logo-presets";

export function LogoPicker({ defaultValue }: { defaultValue: LogoPreset }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted">Logo del perfil público</legend>
      <div className="flex flex-wrap gap-3">
        {LOGO_PRESETS.map((preset) => {
          const Icono = LOGO_ICONOS[preset];
          return (
            <label
              key={preset}
              className="flex cursor-pointer items-center gap-2 rounded border border-line bg-night px-3 py-2 text-gold has-[:checked]:border-gold"
            >
              <input
                type="radio"
                name="logoPreset"
                value={preset}
                defaultChecked={preset === defaultValue}
                className="accent-violet"
              />
              <Icono />
              <span className="text-sm text-ink">{LOGO_LABELS[preset]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
