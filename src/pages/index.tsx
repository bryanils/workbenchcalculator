import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Upload, Download, Trash2, Hammer } from "lucide-react";
import { calculateFromInputs } from "~/lib/calculator";
import type { BenchConfig, CalcResult, SimpleInputs } from "~/lib/types";
import { formatLength, fromInches, toInches, type Unit } from "~/lib/units";
import { LumberDiagram } from "~/components/LumberDiagram";
import { SheetDiagram } from "~/components/SheetDiagram";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";
import { ElevationViews } from "~/components/ElevationViews";
import { ThemeToggle } from "~/components/ThemeToggle";
import { PRESETS } from "~/lib/presets";
import {
  STYLE_PROFILES,
  type BenchStyleId,
  type ViseKind,
} from "~/lib/styles";
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
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

const DEFAULT_INPUTS: SimpleInputs = {
  styleId: "heavy-garage",
  topLength: 72,
  topDepth: 30,
  totalHeight: 34,
};

type PrintSections = {
  diagrams: boolean;
  specs: boolean;
  cutList: boolean;
  lumberDiagrams: boolean;
  sheetLayouts: boolean;
  materials: boolean;
  directions: boolean;
};

const DEFAULT_PRINT_SECTIONS: PrintSections = {
  diagrams: true,
  specs: true,
  cutList: true,
  lumberDiagrams: true,
  sheetLayouts: true,
  materials: true,
  directions: true,
};

const PRINT_SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
  { key: "diagrams", label: "Iso & elevation diagrams" },
  { key: "specs", label: "Specifications" },
  { key: "cutList", label: "Cut list table" },
  { key: "lumberDiagrams", label: "Lumber cutting diagrams" },
  { key: "sheetLayouts", label: "Sheet cutting layouts" },
  { key: "materials", label: "Materials & tools" },
  { key: "directions", label: "Build directions" },
];

type FormState = {
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
};

function buildInputs(form: FormState, unit: Unit): SimpleInputs {
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
  };
}

export default function Home() {
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(() => formFromInputs(DEFAULT_INPUTS));
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [designName, setDesignName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [printSections, setPrintSections] = useState<PrintSections>(DEFAULT_PRINT_SECTIONS);

  useEffect(() => {
    setSavedDesigns(loadSavedDesigns());
  }, []);

  const inputs = useMemo(() => buildInputs(form, unit), [form, unit]);
  const result: CalcResult = useMemo(() => calculateFromInputs(inputs), [inputs]);

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

  const config = result.derived;

  return (
    <>
      <Head>
        <title>Workbench Calculator — real plans, real cut lists</title>
        <meta
          name="description"
          content="Pick a real workbench style — Roubo, Moravian, Knockdown Nicholson, Garage Workhorse — set your dimensions, get a structurally-sound cut list, materials list, and step-by-step build directions."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <header className="no-print mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Hammer className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Workbench Calculator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pick a real bench style, set three dimensions, get a buildable plan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UnitToggle value={unit} onChange={handleUnitChange} />
              <ThemeToggle />
              <PrintMenu
                sections={printSections}
                setSections={setPrintSections}
              />
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
            <aside className="no-print space-y-4 self-start lg:sticky lg:top-4">
              <SidebarInputs
                form={form}
                setForm={setForm}
                unit={unit}
                onStyleChange={handleStyleChange}
                onLoadPreset={handleLoadPreset}
              />
              <SavedDesignsCard
                designs={savedDesigns}
                designName={designName}
                setDesignName={setDesignName}
                onSave={handleSaveDesign}
                onLoad={handleLoadDesign}
                onDelete={handleDeleteDesign}
                onExport={handleExportJson}
                onImport={(f) => handleImportFile(f)}
                fileInputRef={fileInputRef}
              />
            </aside>

            <section className="space-y-4">
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

              <Tabs defaultValue="overview" className="no-print space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="cutplan">Cut Plan</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="directions">Directions</TabsTrigger>
                  <TabsTrigger value="print">Print preview</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <OverviewTab result={result} config={config} unit={unit} />
                </TabsContent>
                <TabsContent value="cutplan" className="space-y-4">
                  <CutPlanTab result={result} unit={unit} />
                </TabsContent>
                <TabsContent value="materials" className="space-y-4">
                  <MaterialsTab result={result} />
                </TabsContent>
                <TabsContent value="directions" className="space-y-4">
                  <DirectionsTab result={result} />
                </TabsContent>
                <TabsContent value="print" className="space-y-4">
                  <PrintPreview
                    result={result}
                    config={config}
                    unit={unit}
                    sections={printSections}
                  />
                </TabsContent>
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
      </main>
    </>
  );
}

/* ====================================================================== */
/*                              SIDEBAR                                   */
/* ====================================================================== */

function SidebarInputs({
  form, setForm, unit, onStyleChange, onLoadPreset,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  unit: Unit;
  onStyleChange: (id: BenchStyleId) => void;
  onLoadPreset: (id: string) => void;
}) {
  const style = STYLE_PROFILES.find((s) => s.id === form.styleId)!;
  const u = unit === "in" ? '"' : " mm";
  const [lenMin, lenMax] = style.lengthRange;
  const [depMin, depMax] = style.depthRange;
  const [hMin, hMax] = style.heightRange;
  const conv = (i: number) => (unit === "in" ? i : Math.round(fromInches(i, unit)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design your bench</CardTitle>
        <CardDescription>
          The bench style picks every structural choice. You set the size.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Bench style</Label>
          <Select value={form.styleId} onValueChange={(v) => onStyleChange(v as BenchStyleId)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a style…" />
            </SelectTrigger>
            <SelectContent>
              {STYLE_PROFILES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{style.useCase}</div>
            <div className="mt-1">{style.blurb}</div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-2">
          <DimField label="Length" hint={`${conv(lenMin)}-${conv(lenMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
            value={form.topLength} onChange={(v) => setForm({ ...form, topLength: v })} />
          <DimField label="Depth" hint={`${conv(depMin)}-${conv(depMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
            value={form.topDepth} onChange={(v) => setForm({ ...form, topDepth: v })} />
          <DimField label="Height" hint={`${conv(hMin)}-${conv(hMax)}${u}`} suffix={u} step={unit === "in" ? 0.25 : 1}
            value={form.totalHeight} onChange={(v) => setForm({ ...form, totalHeight: v })} />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accessories
          </div>
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

          <div className="space-y-1.5">
            <Label className="text-xs">Vise (override style default)</Label>
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
                  Style default ({prettyVise(style.vise)})
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
            <Label className="text-xs">Joinery (override style default)</Label>
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
                <SelectItem value="style-default">Style default ({style.joinery})</SelectItem>
                <SelectItem value="pocket">Pocket screws</SelectItem>
                <SelectItem value="lag">Lag bolts</SelectItem>
                <SelectItem value="mortise">Mortise &amp; tenon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Drawers
          </div>
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
            <div className="text-[10px] text-muted-foreground">
              Style default: {style.defaultDrawerCount ?? 0}
            </div>
          </div>
          {form.drawerCount > 0 && (
            <>
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
                    <SelectItem value="under-top">Hanging under top (row)</SelectItem>
                    <SelectItem value="below-shelf">
                      End-of-bench column (above shelf)
                    </SelectItem>
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
                    <SelectItem value="metal">Metal ball-bearing slides</SelectItem>
                    <SelectItem value="wooden">Shop-made wooden runners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Browse built-in plans</Label>
          <Select onValueChange={onLoadPreset}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Load preset…" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function DimField({
  label, hint, suffix, value, onChange, step = 1,
}: {
  label: string;
  hint?: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
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

function ToggleRow({
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

function SavedDesignsCard({
  designs, designName, setDesignName, onSave, onLoad, onDelete, onExport, onImport, fileInputRef,
}: {
  designs: SavedDesign[];
  designName: string;
  setDesignName: (s: string) => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (f: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saved designs</CardTitle>
        <CardDescription>Saved locally in your browser</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={designName}
            placeholder="Name this design"
            onChange={(e) => setDesignName(e.target.value)}
          />
          <Button variant="default" onClick={onSave} className="shrink-0">Save</Button>
        </div>

        {designs.length > 0 && (
          <div className="space-y-1">
            {designs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
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
                  size="sm"
                  aria-label={`Delete ${d.name}`}
                  onClick={() => onDelete(d.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
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
      </CardContent>
    </Card>
  );
}

/* ====================================================================== */
/*                          OVERVIEW TAB                                  */
/* ====================================================================== */

function OverviewTab({
  result, config, unit,
}: {
  result: CalcResult;
  config: BenchConfig;
  unit: Unit;
}) {
  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <BenchIsoDiagram config={config} unit={unit} />
          <ElevationViews config={config} unit={unit} />
        </CardContent>
      </Card>

      <StabilityCard result={result} />
      <SpecCard config={config} result={result} unit={unit} />
      <DesignNotesCard config={config} />
    </>
  );
}

function StabilityCard({ result }: { result: CalcResult }) {
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

function MetricBox({
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

function SpecCard({
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

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function DesignNotesCard({ config }: { config: BenchConfig }) {
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
/*                          CUT PLAN TAB                                  */
/* ====================================================================== */

function CutPlanTab({ result, unit }: { result: CalcResult; unit: Unit }) {
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

function CutListTable({ rows, unit }: { rows: CalcResult["cutList"]; unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
              <td className="py-1.5 pr-3">{r.materialLabel}</td>
              <td className="py-1.5 pr-3 font-mono text-xs">
                {formatLength(r.length, unit)}
                {r.width !== undefined && ` × ${formatLength(r.width, unit)}`}
                {r.thickness !== undefined && ` × ${formatLength(r.thickness, unit)}`}
              </td>
              <td className="py-1.5 pr-3 text-muted-foreground">{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ====================================================================== */
/*                          MATERIALS TAB                                 */
/* ====================================================================== */

function MaterialsTab({ result }: { result: CalcResult }) {
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                    <td className="py-1.5 pr-3 font-semibold">
                      {h.qty}{h.unit ? ` ${h.unit}` : ""}
                    </td>
                    <td className="py-1.5 pr-3">{h.itemLabel}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{h.note ?? ""}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                      {h.estimatedCost !== undefined ? `$${h.estimatedCost.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

/* ====================================================================== */
/*                          DIRECTIONS TAB                                */
/* ====================================================================== */

function DirectionsTab({ result }: { result: CalcResult }) {
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
/*                          PRINT PREVIEW                                 */
/* ====================================================================== */

function PrintPreview({
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

function PrintMenu({
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

/* ====================================================================== */
/*                              HELPERS                                   */
/* ====================================================================== */

function UnitToggle({
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

function formFromInputs(input: SimpleInputs): FormState {
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
  };
}

function topDescription(c: BenchConfig): string {
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

function prettyVise(v: ViseKind): string {
  return {
    "none": "no vise",
    "front-face-vise": "front face vise",
    "leg-vise": "leg vise",
    "tail-vise": "tail vise",
    "quick-release-9in": 'quick-release 9"',
    "pipe-clamp-vise": "pipe-clamp vise",
  }[v];
}

function roundUI(v: number) {
  return Math.round(v * 4) / 4;
}
