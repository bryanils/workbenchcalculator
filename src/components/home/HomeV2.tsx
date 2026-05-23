"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Library,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Sliders,
} from "lucide-react";

import type { CalcResult, SimpleInputs } from "~/lib/types";
import { fromInches, toInches, type Unit, formatLength } from "~/lib/units";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";
import { ElevationViews } from "~/components/ElevationViews";
import { PRESETS } from "~/lib/presets";
import { STYLE_PROFILES, type BenchStyleId, type ViseKind } from "~/lib/styles";
import {
  loadSavedDesigns,
  newDesignId,
  writeSavedDesigns,
  type SavedDesign,
} from "~/lib/storage";

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
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { PageHeaderSlot } from "~/components/PageHeaderSlot";

import {
  buildInputs,
  calculateFromInputs,
  CutPlanTab,
  DEFAULT_INPUTS,
  DEFAULT_PRINT_SECTIONS,
  DesignNotesCard,
  DimField,
  DirectionsTab,
  formFromInputs,
  MaterialsTab,
  prettyVise,
  PrintMenu,
  PrintPreview,
  roundUI,
  seedFromQuery,
  ToggleRow,
  UnitToggle,
  type FormState,
  type PrintSections,
} from "./shared";

export default function HomeV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(() => formFromInputs(DEFAULT_INPUTS));
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [designName, setDesignName] = useState("");
  const [printSections, setPrintSections] =
    useState<PrintSections>(DEFAULT_PRINT_SECTIONS);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSavedDesigns(loadSavedDesigns());
  }, []);

  useEffect(() => {
    const q = Object.fromEntries(searchParams?.entries() ?? []);
    const seeded = seedFromQuery(q);
    if (seeded) {
      setUnit("in");
      setForm(seeded);
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputs = useMemo(() => buildInputs(form, unit), [form, unit]);
  const result: CalcResult = useMemo(() => calculateFromInputs(inputs), [inputs]);
  const config = result.derived;
  const style = STYLE_PROFILES.find((s) => s.id === form.styleId)!;

  const handleUnitChange = (newUnit: Unit) => {
    if (newUnit === unit) return;
    setForm((f) => ({
      ...f,
      topLength: roundUI(fromInches(toInches(f.topLength, unit), newUnit)),
      topDepth: roundUI(fromInches(toInches(f.topDepth, unit), newUnit)),
      totalHeight: roundUI(fromInches(toInches(f.totalHeight, unit), newUnit)),
      pegboardHeight: roundUI(fromInches(toInches(f.pegboardHeight, unit), newUnit)),
    }));
    setUnit(newUnit);
  };

  const handleStyleChange = (styleId: BenchStyleId) => {
    const s = STYLE_PROFILES.find((x) => x.id === styleId);
    if (!s) return;
    setForm({
      styleId: s.id,
      topLength: unit === "in" ? s.defaultLength : roundUI(fromInches(s.defaultLength, unit)),
      topDepth: unit === "in" ? s.defaultDepth : roundUI(fromInches(s.defaultDepth, unit)),
      totalHeight: unit === "in" ? s.defaultHeight : roundUI(fromInches(s.defaultHeight, unit)),
      casters: s.casters,
      pegboard: false,
      pegboardHeight: 24,
      viseOverride: undefined,
      joineryOverride: undefined,
      drawerCount: s.defaultDrawerCount ?? 0,
      drawerLocation: s.defaultDrawerLocation ?? "under-top",
      drawerSlideType: s.defaultDrawerSlideType ?? "metal",
      benchCount: form.benchCount,
    });
  };

  const handleSaveDesign = () => {
    const name = designName.trim() || `Design ${savedDesigns.length + 1}`;
    const next: SavedDesign[] = [
      ...savedDesigns,
      {
        id: newDesignId(),
        name,
        savedAt: new Date().toISOString(),
        input: buildInputs(form, unit),
      },
    ];
    setSavedDesigns(next);
    writeSavedDesigns(next);
    setDesignName("");
  };

  const handleLoadDesign = (id: string) => {
    const d = savedDesigns.find((x) => x.id === id);
    if (!d) return;
    setUnit("in");
    setForm(formFromInputs(d.input));
  };

  const handleDeleteDesign = (id: string) => {
    const next = savedDesigns.filter((d) => d.id !== id);
    setSavedDesigns(next);
    writeSavedDesigns(next);
  };

  const handleExportJson = () => {
    const data = {
      schema: "workbench-calculator/v2",
      exportedAt: new Date().toISOString(),
      input: buildInputs(form, unit),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workbench-${(designName || "design").trim().replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as { input?: SimpleInputs };
        if (data?.input) {
          setUnit("in");
          setForm(formFromInputs(data.input));
        }
      } catch {
        alert("Could not parse that JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setUnit("in");
    setForm(formFromInputs(p.input));
  };

  return (
    <div className="@container flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <PageHeaderSlot>
        <span className="truncate text-sm font-medium text-muted-foreground">
          Calculator
        </span>
        <Badge variant="secondary" className="font-mono text-[10px]">v2</Badge>
        <div className="ml-auto flex items-center gap-2">
          <LibraryPopover
            designs={savedDesigns}
            designName={designName}
            setDesignName={setDesignName}
            onSave={handleSaveDesign}
            onLoad={handleLoadDesign}
            onDelete={handleDeleteDesign}
            onExport={handleExportJson}
            onImport={handleImportFile}
            onLoadPreset={handleLoadPreset}
            fileInputRef={fileInputRef}
          />
          <UnitToggle value={unit} onChange={handleUnitChange} />
          <PrintMenu sections={printSections} setSections={setPrintSections} />
        </div>
      </PageHeaderSlot>

      <div className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col gap-4 px-4 py-4 @5xl:flex-row">
        {/* LEFT: persistent preview pane */}
        <aside className="no-print flex min-h-0 flex-col gap-3 @5xl:w-[28rem] @5xl:flex-none">
          <SpecStrip
            styleName={style.name}
            form={form}
            unit={unit}
            verdict={result.stability.verdict}
            score={result.stability.score}
            cost={result.totals.estimatedCost}
          />
          <Card className="flex-1 overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <BenchIsoDiagram config={config} unit={unit} />
              <ElevationViews config={config} unit={unit} />
            </CardContent>
          </Card>
          <StabilityStrip result={result} />
        </aside>

        {/* RIGHT: workflow tabs */}
        <section className="@container flex min-h-0 flex-1 flex-col">
          <Tabs
            defaultValue="design"
            className="no-print flex min-h-0 flex-1 flex-col gap-3"
          >
            <TabsList className="w-full shrink-0 justify-start overflow-x-auto">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="cutplan">Cut plan</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="build">Build</TabsTrigger>
              <TabsTrigger value="print">Print</TabsTrigger>
            </TabsList>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 pr-3">
                {result.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>Calculator warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="ml-5 list-disc text-sm">
                        {result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <TabsContent value="design" className="mt-0 space-y-4">
                  <DesignTab
                    form={form}
                    setForm={setForm}
                    unit={unit}
                    onStyleChange={handleStyleChange}
                  />
                  <DesignNotesCard config={config} />
                </TabsContent>
                <TabsContent value="cutplan" className="mt-0 space-y-4">
                  <CutPlanTab result={result} unit={unit} />
                </TabsContent>
                <TabsContent value="materials" className="mt-0 space-y-4">
                  <MaterialsTab result={result} />
                </TabsContent>
                <TabsContent value="build" className="mt-0 space-y-4">
                  <DirectionsTab result={result} />
                </TabsContent>
                <TabsContent value="print" className="mt-0 space-y-4">
                  <PrintPreview
                    result={result}
                    config={config}
                    unit={unit}
                    sections={printSections}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <div className="print-only">
            <PrintPreview
              result={result}
              config={config}
              unit={unit}
              sections={printSections}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*                          SPEC STRIP                                    */
/* ====================================================================== */

function SpecStrip({
  styleName, form, unit, verdict, score, cost,
}: {
  styleName: string;
  form: FormState;
  unit: Unit;
  verdict: "solid" | "acceptable" | "marginal" | "unstable";
  score: number;
  cost?: number;
}) {
  const verdictMap = {
    solid: { label: "Solid", tone: "border-success/30 bg-success/15 text-success" },
    acceptable: { label: "Acceptable", tone: "border-accent/40 bg-accent/15 text-accent-foreground" },
    marginal: { label: "Marginal", tone: "border-warning/30 bg-warning/15 text-warning" },
    unstable: { label: "Unstable", tone: "border-destructive/30 bg-destructive/15 text-destructive" },
  }[verdict];

  const lenIn = toInches(form.topLength, unit);
  const depIn = toInches(form.topDepth, unit);
  const heightIn = toInches(form.totalHeight, unit);

  return (
    <Card className="shrink-0">
      <CardContent className="space-y-2 p-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Currently designing
        </div>
        <div className="text-base font-semibold leading-tight">{styleName}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Chip>
            <span className="font-mono tabular-nums">
              {formatLength(lenIn, unit)} × {formatLength(depIn, unit)} × {formatLength(heightIn, unit)}
            </span>
          </Chip>
          <Chip>×{form.benchCount} {form.benchCount === 1 ? "bench" : "benches"}</Chip>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${verdictMap.tone}`}
          >
            ● {verdictMap.label}
            <span className="font-mono text-[10px] opacity-70">{score}</span>
          </span>
          {cost !== undefined && (
            <Chip>
              <span className="font-mono tabular-nums">~${cost.toFixed(0)}</span>
            </Chip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground">
      {children}
    </span>
  );
}

/* ====================================================================== */
/*                          STABILITY STRIP                               */
/* ====================================================================== */

function StabilityStrip({ result }: { result: CalcResult }) {
  const s = result.stability;
  return (
    <Card className="shrink-0">
      <CardContent className="p-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniMetric label="Sag" value={`${s.topSagInches.toFixed(2)}"`} ok={s.topSagInches <= s.topSagLimitInches} />
          <MiniMetric label="Racking" value={`${s.rackingResistanceLbf.toFixed(0)}`} sub="lbf" ok={s.rackingResistanceLbf > 200} />
          <MiniMetric label="Footprint" value={s.tipRatio.toFixed(2)} ok={s.tipRatio >= 0.45} />
          <MiniMetric label="Weight" value={`${s.baseWeightLb.toFixed(0)}`} sub="lb" ok={s.baseWeightLb > 50} />
        </div>
        {s.warnings.length > 0 && (
          <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
            {s.warnings[0]}
            {s.warnings.length > 1 && <span className="opacity-70"> · +{s.warnings.length - 1} more</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  label, value, sub, ok,
}: { label: string; value: string; sub?: string; ok: boolean }) {
  return (
    <div className={`rounded-md border px-1.5 py-1.5 ${ok ? "border-border bg-muted/30" : "border-destructive/40 bg-destructive/10"}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums leading-tight">
        {value}
        {sub && <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*                          DESIGN TAB                                    */
/* ====================================================================== */

function DesignTab({
  form, setForm, unit, onStyleChange,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  unit: Unit;
  onStyleChange: (id: BenchStyleId) => void;
}) {
  const style = STYLE_PROFILES.find((s) => s.id === form.styleId)!;
  const u = unit === "in" ? '"' : " mm";
  const [lenMin, lenMax] = style.lengthRange;
  const [depMin, depMax] = style.depthRange;
  const [hMin, hMax] = style.heightRange;
  const conv = (i: number) => (unit === "in" ? i : Math.round(fromInches(i, unit)));

  return (
    <>
      {/* Style picker: visual card grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bench style</CardTitle>
          <CardDescription>Picks every structural choice. Click to swap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-4">
            {STYLE_PROFILES.map((s) => {
              const active = s.id === form.styleId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onStyleChange(s.id)}
                  className={`rounded-md border p-2.5 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="text-xs font-semibold leading-tight">{s.name}</div>
                  <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                    {s.useCase}
                  </div>
                  <div className="mt-1 font-mono text-[9px] tabular-nums text-muted-foreground">
                    {s.defaultLength}″ × {s.defaultDepth}″
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{style.useCase}</div>
            <div className="mt-1">{style.blurb}</div>
          </div>
        </CardContent>
      </Card>

      {/* Dimensions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dimensions</CardTitle>
          <CardDescription>You set the size — style fills in the rest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <DimField label="Length" hint={`${conv(lenMin)}-${conv(lenMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
              unit={unit}
              value={form.topLength} onChange={(v) => setForm({ ...form, topLength: v })} />
            <DimField label="Depth" hint={`${conv(depMin)}-${conv(depMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
              unit={unit}
              value={form.topDepth} onChange={(v) => setForm({ ...form, topDepth: v })} />
            <DimField label="Height" hint={`${conv(hMin)}-${conv(hMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
              unit={unit}
              value={form.totalHeight} onChange={(v) => setForm({ ...form, totalHeight: v })} />
          </div>
          <DimField
            label="How many to build"
            hint="Pieces are pooled across benches so sheet & lumber tile jointly for less waste"
            suffix="benches"
            step={1}
            value={form.benchCount}
            onChange={(v) =>
              setForm({ ...form, benchCount: Math.max(1, Math.min(20, Math.floor(v || 1))) })
            }
          />
        </CardContent>
      </Card>

      {/* Accessories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accessories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="Locking casters"
            description="Roll-around bench — 4x4 posts recommended"
            checked={form.casters}
            onChange={(v) => setForm({ ...form, casters: v })}
          />
          <ToggleRow
            label="Pegboard back"
            description="Tool storage panel mounted above the top"
            checked={form.pegboard}
            onChange={(v) => setForm({ ...form, pegboard: v })}
          />
        </CardContent>
      </Card>

      {/* Drawers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Drawers
            {form.drawerCount > 0 && (
              <Badge variant="secondary" className="font-mono">{form.drawerCount}</Badge>
            )}
          </CardTitle>
          <CardDescription>Style default: {style.defaultDrawerCount ?? 0}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of drawers</Label>
            <Select
              value={String(form.drawerCount)}
              onValueChange={(v) => setForm({ ...form, drawerCount: parseInt(v, 10) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.drawerCount > 0 && (
            <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Select
                  value={form.drawerLocation}
                  onValueChange={(v) =>
                    setForm({ ...form, drawerLocation: v as FormState["drawerLocation"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-top">Hanging under top</SelectItem>
                    <SelectItem value="below-shelf">End-of-bench column</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slide type</Label>
                <Select
                  value={form.drawerSlideType}
                  onValueChange={(v) =>
                    setForm({ ...form, drawerSlideType: v as FormState["drawerSlideType"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metal">Metal ball-bearing</SelectItem>
                    <SelectItem value="wooden">Shop-made wooden runners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdvancedDisclosure form={form} setForm={setForm} styleVise={style.vise} styleJoinery={style.joinery} />
    </>
  );
}

function AdvancedDisclosure({
  form, setForm, styleVise, styleJoinery,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  styleVise: ViseKind;
  styleJoinery: string;
}) {
  const [open, setOpen] = useState(
    form.viseOverride !== undefined || form.joineryOverride !== undefined,
  );
  const overridden =
    (form.viseOverride ? 1 : 0) + (form.joineryOverride ? 1 : 0);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <Sliders className="size-4 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Advanced overrides</div>
          <div className="text-[11px] text-muted-foreground">
            {overridden > 0
              ? `${overridden} override${overridden === 1 ? "" : "s"} active — click to edit`
              : "Vise & joinery — override the style defaults"}
          </div>
        </div>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <>
          <Separator />
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Vise</Label>
              <Select
                value={form.viseOverride ?? "style-default"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    viseOverride: v === "style-default" ? undefined : (v as ViseKind),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style-default">
                    Style default ({prettyVise(styleVise)})
                  </SelectItem>
                  <SelectItem value="none">No vise</SelectItem>
                  <SelectItem value="front-face-vise">Front face vise</SelectItem>
                  <SelectItem value="leg-vise">Leg vise</SelectItem>
                  <SelectItem value="tail-vise">Tail vise</SelectItem>
                  <SelectItem value="quick-release-9in">Quick-release 9&quot;</SelectItem>
                  <SelectItem value="pipe-clamp-vise">Pipe-clamp (shop-built)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Joinery</Label>
              <Select
                value={form.joineryOverride ?? "style-default"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    joineryOverride:
                      v === "style-default" ? undefined : (v as FormState["joineryOverride"]),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="style-default">Style default ({styleJoinery})</SelectItem>
                  <SelectItem value="pocket">Pocket screws</SelectItem>
                  <SelectItem value="lag">Lag bolts</SelectItem>
                  <SelectItem value="mortise">Mortise &amp; tenon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

/* ====================================================================== */
/*                          LIBRARY POPOVER                               */
/* ====================================================================== */

function LibraryPopover({
  designs, designName, setDesignName, onSave, onLoad, onDelete, onExport, onImport, onLoadPreset, fileInputRef,
}: {
  designs: SavedDesign[];
  designName: string;
  setDesignName: (s: string) => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (f: File) => void;
  onLoadPreset: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Library className="size-4" />
          Library
          {designs.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 font-mono">{designs.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1rem)] p-0"
      >
        <Tabs defaultValue="saved" className="flex w-full flex-col">
          <TabsList className="m-2 mb-0">
            <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
            <TabsTrigger value="presets" className="flex-1">Built-in plans</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="m-0 flex flex-col gap-3 p-3">
            <div className="flex gap-2">
              <Input
                value={designName}
                placeholder="Name this design"
                onChange={(e) => setDesignName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button variant="default" size="sm" onClick={onSave} className="shrink-0">
                Save
              </Button>
            </div>

            {designs.length > 0 ? (
              <ScrollArea className="h-56 rounded-md border border-border">
                <div className="space-y-1 p-2">
                  {designs.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => onLoad(d.id)}
                        className="flex-1 truncate text-left hover:text-primary"
                        title={`Saved ${new Date(d.savedAt).toLocaleString()}`}
                      >
                        {d.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${d.name}`}
                        onClick={() => onDelete(d.id)}
                        className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                No saved designs yet.
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                <Download className="size-3.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="size-3.5" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="presets" className="m-0 p-3">
            <ScrollArea className="h-72 rounded-md border border-border">
              <div className="space-y-1 p-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onLoadPreset(p.id)}
                    className="block w-full rounded-md border border-border bg-card px-2 py-1.5 text-left text-sm transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
