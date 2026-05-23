"use client";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { feetInchesSchema, splitFeetInches } from "~/lib/parseLength";
import type { Unit } from "~/lib/units";

type Props = {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  /** When omitted, renders a single numeric input. When "in", renders feet + inches split. */
  unit?: Unit;
  hint?: string;
  step?: number;
};

export function DimField({ label, hint, suffix, value, onChange, step = 1, unit }: Props) {
  if (unit === "in") {
    const split = splitFeetInches(value);
    const handleChange = (next: { feet?: number; inches?: number }) => {
      const candidate = {
        feet: next.feet ?? split.feet,
        inches: next.inches ?? split.inches,
      };
      const parsed = feetInchesSchema({ fieldName: label }).safeParse(candidate);
      if (parsed.success) onChange(parsed.data);
    };
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={split.feet}
              onChange={(e) => handleChange({ feet: parseFloat(e.target.value) || 0 })}
              className="pr-7 text-sm tabular-nums"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ft
            </span>
          </div>
          <div className="relative flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={step}
              value={split.inches}
              onChange={(e) => handleChange({ inches: parseFloat(e.target.value) || 0 })}
              className="pr-7 text-sm tabular-nums"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              in
            </span>
          </div>
        </div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="pr-8 text-sm tabular-nums"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
