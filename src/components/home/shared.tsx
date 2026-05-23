"use client";

import { Printer } from "lucide-react";
import { calculateFromInputs } from "~/lib/calculator";
import type { BenchConfig, CalcResult, SimpleInputs } from "~/lib/types";
import { formatLength, toInches, type Unit } from "~/lib/units";
import { feetInchesSchema, splitFeetInches } from "~/lib/parseLength";
import { LumberDiagram } from "~/components/LumberDiagram";
import { SheetDiagram } from "~/components/SheetDiagram";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";
import { ElevationViews } from "~/components/ElevationViews";
import {
  STYLE_PROFILES,
  type BenchStyleId,
  type ViseKind,
} from "~/lib/styles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";

export { calculateFromInputs };

/* ====================================================================== */
/*                          TYPES & CONSTANTS                             */
/* ====================================================================== */

export const DEFAULT_INPUTS: SimpleInputs = {
  styleId: "heavy-garage",
  topLength: 72,
  topDepth: 30,
  totalHeight: 34,
};

export type PrintSections = {
  diagrams: boolean;
  specs: boolean;
  cutList: boolean;
  lumberDiagrams: boolean;
  sheetLayouts: boolean;
  materials: boolean;
  directions: boolean;
};

export const DEFAULT_PRINT_SECTIONS: PrintSections = {
  diagrams: true,
  specs: true,
  cutList: true,
  lumberDiagrams: true,
  sheetLayouts: true,
  materials: true,
  directions: true,
};

export const PRINT_SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
  { key: "diagrams", label: "Iso & elevation diagrams" },
  { key: "specs", label: "Specifications" },
  { key: "cutList", label: "Cut list table" },
  { key: "lumberDiagrams", label: "Lumber cutting diagrams" },
  { key: "sheetLayouts", label: "Sheet cutting layouts" },
  { key: "materials", label: "Materials & tools" },
  { key: "directions", label: "Build directions" },
];

export type FormState = {
  styleId: BenchStyleId;
  topLength: number;
  topDepth: number;
  totalHeight: number;
  casters: boolean;
  pegboard: boolean;
  pegboardHeight: number;
  viseOverride?: ViseKind;
  joineryOverride?: "pocket" | "lag" | "mortise";
  drawerCount: number;
  drawerLocation: "under-top" | "below-shelf";
  drawerSlideType: "metal" | "wooden";
  benchCount: number;
};

/* ====================================================================== */
/*                              HELPERS                                   */
/* ====================================================================== */

export function buildInputs(form: FormState, unit: Unit): SimpleInputs {
  return {
    styleId: form.styleId,
    topLength: toInches(form.topLength, unit),
    topDepth: toInches(form.topDepth, unit),
    totalHeight: toInches(form.totalHeight, unit),
    casters: form.casters,
    pegboard: form.pegboard,
    pegboardHeight: toInches(form.pegboardHeight, unit),
    viseOverride: form.viseOverride,
    joineryOverride: form.joineryOverride,
    drawerCount: form.drawerCount,
    drawerLocation: form.drawerLocation,
    drawerSlideType: form.drawerSlideType,
    benchCount: form.benchCount,
  };
}

export function formFromInputs(input: SimpleInputs): FormState {
  const style = STYLE_PROFILES.find((s) => s.id === input.styleId);
  return {
    styleId: input.styleId,
    topLength: input.topLength,
    topDepth: input.topDepth,
    totalHeight: input.totalHeight,
    casters: input.casters ?? false,
    pegboard: input.pegboard ?? false,
    pegboardHeight: input.pegboardHeight ?? 24,
    viseOverride: input.viseOverride,
    joineryOverride: input.joineryOverride,
    drawerCount: input.drawerCount ?? style?.defaultDrawerCount ?? 0,
    drawerLocation: input.drawerLocation ?? style?.defaultDrawerLocation ?? "under-top",
    drawerSlideType: input.drawerSlideType ?? style?.defaultDrawerSlideType ?? "metal",
    benchCount: Math.max(1, Math.min(20, Math.floor(input.benchCount ?? 1))),
  };
}

export function seedFromQuery(
  q: Record<string, string | string[] | undefined>,
): FormState | null {
  const num = (v: string | string[] | undefined): number | undefined => {
    if (typeof v !== "string") return undefined;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (v: string | string[] | undefined): string | undefined =>
    typeof v === "string" ? v : undefined;

  const topLength = num(q.topLength);
  const topDepth = num(q.topDepth);
  const totalHeight = num(q.totalHeight);
  const benchCount = num(q.benchCount);
  const styleIdRaw = str(q.styleId);

  if (
    topLength === undefined &&
    topDepth === undefined &&
    totalHeight === undefined &&
    benchCount === undefined &&
    styleIdRaw === undefined
  ) {
    return null;
  }

  const style =
    STYLE_PROFILES.find((s) => s.id === styleIdRaw) ??
    STYLE_PROFILES.find((s) => s.id === DEFAULT_INPUTS.styleId)!;
  return formFromInputs({
    styleId: style.id,
    topLength: topLength ?? style.defaultLength,
    topDepth: topDepth ?? style.defaultDepth,
    totalHeight: totalHeight ?? style.defaultHeight,
    benchCount: benchCount ?? 1,
  });
}

export function topDescription(c: BenchConfig): string {
  switch (c.topConstruction) {
    case "single-sheet":
      return `single ${c.topMaterialId.replace("_", " ")}`;
    case "doubled-sheet":
      return `doubled ${c.topMaterialId.replace("_", " ")}`;
    case "laminated-2x":
      return `${c.topLamCount} × ${c.topMaterialId} laminated`;
    case "slab":
      return `${c.topSlabThickness}" laminated slab`;
  }
}

export function prettyVise(v: ViseKind): string {
  return {
    "none": "no vise",
    "front-face-vise": "front face vise",
    "leg-vise": "leg vise",
    "tail-vise": "tail vise",
    "quick-release-9in": 'quick-release 9"',
    "pipe-clamp-vise": "pipe-clamp vise",
  }[v];
}

export function roundUI(v: number) {
  return Math.round(v * 4) / 4;
}

/* ====================================================================== */
/*                          INPUT PRIMITIVES                              */
/* ====================================================================== */

export function DimField({
  label, hint, suffix, value, onChange, step = 1, unit,
}: {
  label: string;
  hint?: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  unit?: Unit;
}) {
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
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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

export function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ====================================================================== */
/*                           STABILITY / SPEC                             */
/* ====================================================================== */

export function StabilityCard({ result }: { result: CalcResult }) {
  const s = result.stability;
  const variant: "default" | "secondary" | "destructive" | "outline" =
    s.verdict === "solid"
      ? "default"
      : s.verdict === "acceptable"
        ? "secondary"
        : s.verdict === "marginal"
          ? "outline"
          : "destructive";
  const verdictLabel = {
    solid: "Solid build",
    acceptable: "Acceptable",
    marginal: "Marginal",
    unstable: "Unstable",
  }[s.verdict];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stability assessment
          <Badge variant={variant}>{verdictLabel}</Badge>
          <Badge variant="outline" className="font-mono">{s.score}/100</Badge>
        </CardTitle>
        <CardDescription>
          Top sag, racking resistance, footprint ratio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricBox label="Top sag (200 lb)" value={`${s.topSagInches.toFixed(2)}"`}
            sub={`limit ${s.topSagLimitInches.toFixed(2)}"`}
            ok={s.topSagInches <= s.topSagLimitInches} />
          <MetricBox label="Racking" value={`${s.rackingResistanceLbf.toFixed(0)} lbf`}
            sub="lateral push" ok={s.rackingResistanceLbf > 200} />
          <MetricBox label="Footprint" value={s.tipRatio.toFixed(2)}
            sub="width / height" ok={s.tipRatio >= 0.45} />
          <MetricBox label="Weight" value={`${s.baseWeightLb.toFixed(0)} lb`}
            sub="assembled" ok={s.baseWeightLb > 50} />
        </div>
        {s.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Structural concerns</AlertTitle>
            <AlertDescription>
              <ul className="ml-5 list-disc">
                {s.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {s.notes.length > 0 && (
          <ul className="ml-5 list-disc text-sm text-muted-foreground">
            {s.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricBox({
  label, value, sub, ok,
}: { label: string; value: string; sub?: string; ok: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 ${ok ? "border-border bg-muted/40" : "border-destructive/50 bg-destructive/10"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SpecCard({
  config, result, unit,
}: { config: BenchConfig; result: CalcResult; unit: Unit }) {
  const style = STYLE_PROFILES.find((s) => s.id === config.styleId)!;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
        <CardDescription>Derived from the {style.name} profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <SpecRow label="Footprint" value={`${formatLength(config.topLength, unit)} × ${formatLength(config.topDepth, unit)}`} />
          <SpecRow label="Height" value={formatLength(config.totalHeight, unit)} />
          <SpecRow label="Legs" value={`4× ${config.legMaterialId}${config.legSplayDeg > 0 ? ` (splay ${config.legSplayDeg}°)` : ""}`} />
          <SpecRow label="Aprons" value={config.apronMaterialId} />
          <SpecRow label="Top" value={topDescription(config)} />
          <SpecRow label="Joinery" value={config.joinery + (config.knockdown ? " (knockdown)" : "")} />
          <SpecRow label="Floor stretchers" value={config.stretchers.floorStretchers ? `${config.stretcherMaterialId} @ ${formatLength(config.stretchers.floorStretcherHeight, unit)}` : "none"} />
          <SpecRow label="Center stretcher" value={config.stretchers.centerStretcher ? "yes" : "no"} />
          <SpecRow label="Lower shelf" value={config.stretchers.lowerShelf ? `at ${formatLength(config.stretchers.shelfHeight, unit)}` : "none"} />
          <SpecRow label="Vise" value={prettyVise(config.vise)} />
          <SpecRow label="Casters" value={config.casters ? "4× HD locking" : "none"} />
          <SpecRow label="Pegboard" value={config.pegboard ? `${formatLength(config.pegboardHeight, unit)} tall` : "none"} />
          <SpecRow label="Dog holes" value={config.dogHoles ? `3/4" @ ${formatLength(config.dogHoleSpacing, unit)} OC` : "none"} />
          <SpecRow label="Est. weight" value={`${result.stability.baseWeightLb.toFixed(0)} lb`} />
          {result.totals.estimatedCost !== undefined && (
            <SpecRow label="Est. materials" value={`$${result.totals.estimatedCost.toFixed(0)}`} />
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function DesignNotesCard({ config }: { config: BenchConfig }) {
  const style = STYLE_PROFILES.find((s) => s.id === config.styleId)!;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Why this design works</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
          {style.designNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ====================================================================== */
/*                             OUTPUT TABS                                */
/* ====================================================================== */

export function CutPlanTab({ result, unit }: { result: CalcResult; unit: Unit }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cut list</CardTitle>
          <CardDescription>{result.cutList.length} part types</CardDescription>
        </CardHeader>
        <CardContent>
          <CutListTable rows={result.cutList} unit={unit} />
        </CardContent>
      </Card>

      {result.lumberBoards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lumber cutting diagrams</CardTitle>
            <CardDescription>
              {result.lumberBoards.length} boards · {result.totals.lumberFt.toFixed(1)} linear ft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.lumberBoards.map((b, i) => (
              <LumberDiagram key={i} index={i} board={b} unit={unit} />
            ))}
          </CardContent>
        </Card>
      )}

      {result.sheetLayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sheet cutting layouts</CardTitle>
            <CardDescription>
              {result.sheetLayouts.length} sheet{result.sheetLayouts.length === 1 ? "" : "s"} ({result.totals.sheetSqFt.toFixed(0)} sq ft)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.sheetLayouts.map((l, i) => (
              <SheetDiagram key={i} index={i} layout={l} unit={unit} />
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function CutListTable({ rows, unit }: { rows: CalcResult["cutList"]; unit: Unit }) {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <ScrollArea className="w-full">
        <table className="min-w-max text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Qty</th>
              <th className="py-2 pr-3">Material</th>
              <th className="py-2 pr-3">Dimensions</th>
              <th className="py-2 pr-3">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.partCode} className="border-b border-border/60 align-top">
                <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{r.partCode}</td>
                <td className="py-1.5 pr-3 font-semibold">{r.qty}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">{r.materialLabel}</td>
                <td className="py-1.5 pr-3 font-mono text-xs whitespace-nowrap">
                  {formatLength(r.length, unit)}
                  {r.width !== undefined && ` × ${formatLength(r.width, unit)}`}
                  {r.thickness !== undefined && ` × ${formatLength(r.thickness, unit)}`}
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground">{r.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function MaterialsTab({ result }: { result: CalcResult }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shopping list</CardTitle>
          <CardDescription>
            {result.hardware.length} items · est. ${result.totals.estimatedCost?.toFixed(0) ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-full overflow-hidden">
            <ScrollArea className="w-full">
              <table className="min-w-max text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Note</th>
                    <th className="py-2 pr-3 text-right">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hardware.map((h, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">
                        {h.qty}{h.unit ? ` ${h.unit}` : ""}
                      </td>
                      <td className="py-1.5 pr-3">{h.itemLabel}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{h.note ?? ""}</td>
                      <td className="py-1.5 pr-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {h.estimatedCost !== undefined ? `$${h.estimatedCost.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools you&apos;ll need</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
            {result.tools.map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge variant={t.required ? "default" : "outline"} className="shrink-0">
                  {t.required ? "Req" : "Opt"}
                </Badge>
                <span>{t.name}</span>
                {t.note && <span className="text-xs text-muted-foreground">— {t.note}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

export function DirectionsTab({ result }: { result: CalcResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Build directions</CardTitle>
        <CardDescription>{result.steps.length} steps</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {result.steps.map((s) => (
            <li key={s.n} className="flex gap-4">
              <Badge variant="outline" className="h-7 w-7 shrink-0 justify-center rounded-full font-mono text-sm">
                {s.n}
              </Badge>
              <div className="space-y-1">
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-muted-foreground">{s.body}</div>
                {s.fasteners && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Fasteners:</span> {s.fasteners}
                  </div>
                )}
                {s.tools && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.tools.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ====================================================================== */
/*                             PRINT PREVIEW                              */
/* ====================================================================== */

export function PrintPreview({
  result, config, unit, sections,
}: { result: CalcResult; config: BenchConfig; unit: Unit; sections: PrintSections }) {
  const style = STYLE_PROFILES.find((s) => s.id === config.styleId)!;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{style.name}</CardTitle>
          <CardDescription>
            {formatLength(config.topLength, unit)} × {formatLength(config.topDepth, unit)} × {formatLength(config.totalHeight, unit)} — {style.useCase}
          </CardDescription>
        </CardHeader>
        {sections.diagrams && (
          <CardContent className="space-y-3">
            <BenchIsoDiagram config={config} unit={unit} />
            <ElevationViews config={config} unit={unit} />
          </CardContent>
        )}
      </Card>

      {sections.specs && <SpecCard config={config} result={result} unit={unit} />}

      {sections.cutList && (
        <Card className="print-avoid-break">
          <CardHeader><CardTitle>Cut list</CardTitle></CardHeader>
          <CardContent><CutListTable rows={result.cutList} unit={unit} /></CardContent>
        </Card>
      )}

      {sections.lumberDiagrams && result.lumberBoards.length > 0 && (
        <Card className="print-break">
          <CardHeader>
            <CardTitle>Lumber cutting diagrams</CardTitle>
            <CardDescription>
              {result.lumberBoards.length} boards · {result.totals.lumberFt.toFixed(1)} linear ft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.lumberBoards.map((b, i) => (
              <LumberDiagram key={i} index={i} board={b} unit={unit} />
            ))}
          </CardContent>
        </Card>
      )}

      {sections.sheetLayouts && result.sheetLayouts.length > 0 && (
        <Card className="print-avoid-break">
          <CardHeader>
            <CardTitle>Sheet cutting layouts</CardTitle>
            <CardDescription>
              {result.sheetLayouts.length} sheet{result.sheetLayouts.length === 1 ? "" : "s"} ({result.totals.sheetSqFt.toFixed(0)} sq ft)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.sheetLayouts.map((l, i) => (
              <SheetDiagram key={i} index={i} layout={l} unit={unit} />
            ))}
          </CardContent>
        </Card>
      )}

      {sections.materials && (
        <div className="print-break">
          <MaterialsTab result={result} />
        </div>
      )}

      {sections.directions && (
        <div className="print-break">
          <DirectionsTab result={result} />
        </div>
      )}
    </div>
  );
}

export function PrintMenu({
  sections, setSections,
}: { sections: PrintSections; setSections: (s: PrintSections) => void }) {
  const toggle = (key: keyof PrintSections) =>
    setSections({ ...sections, [key]: !sections[key] });
  const allOn = PRINT_SECTION_LABELS.every(({ key }) => sections[key]);
  const setAll = (value: boolean) =>
    setSections(
      PRINT_SECTION_LABELS.reduce(
        (acc, { key }) => ({ ...acc, [key]: value }),
        {} as PrintSections,
      ),
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" className="gap-1.5">
          <Printer className="size-4" />
          Print
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Sections to print</div>
            <button
              type="button"
              onClick={() => setAll(!allOn)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {allOn ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="space-y-2">
            {PRINT_SECTION_LABELS.map(({ key, label }) => (
              <Label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={sections[key]}
                  onCheckedChange={() => toggle(key)}
                />
                <span>{label}</span>
              </Label>
            ))}
          </div>
          <Button
            className="w-full gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function UnitToggle({
  value, onChange,
}: { value: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-input bg-card">
      {(["in", "mm"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`px-3 py-1.5 text-xs font-medium ${
            value === u
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

/* ====================================================================== */
/*                            UNUSED RE-EXPORTS                           */
/* ====================================================================== */
// Keep these import paths warm so consumers of this module can pull them
// directly without re-importing from elsewhere.
export { Tabs, TabsContent, TabsList, TabsTrigger };
