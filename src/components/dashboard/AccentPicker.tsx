"use client";

import { ACENTOS, ACENTO_LABELS, ACENTO_SWATCH, type Acento } from "@/lib/accent";

export function AccentPicker({ defaultValue }: { defaultValue: Acento }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted">Color de acento del perfil público</legend>
      <div className="flex flex-wrap gap-3">
        {ACENTOS.map((acento) => (
          <label
            key={acento}
            className="flex cursor-pointer items-center gap-2 rounded border border-line bg-night px-3 py-2 has-[:checked]:border-gold"
          >
            <input
              type="radio"
              name="colorAcento"
              value={acento}
              defaultChecked={acento === defaultValue}
              className="accent-violet"
            />
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: ACENTO_SWATCH[acento] }}
              aria-hidden
            />
            <span className="text-sm text-ink">{ACENTO_LABELS[acento]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
