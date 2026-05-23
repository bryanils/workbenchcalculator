"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, Trash2 } from "lucide-react";
import type { BenchConfig, CalcResult, SimpleInputs } from "~/lib/types";
import { fromInches, toInches, type Unit } from "~/lib/units";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";
import { ElevationViews } from "~/components/ElevationViews";
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
import { Separator } from "~/components/ui/separator";
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
  SpecCard,
  StabilityCard,
  ToggleRow,
  UnitToggle,
  type FormState,
  type PrintSections,
} from "./shared";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(() => formFromInputs(DEFAULT_INPUTS));
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [designName, setDesignName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [printSections, setPrintSections] = useState<PrintSections>(DEFAULT_PRINT_SECTIONS);

  useEffect(() => {
    setSavedDesigns(loadSavedDesigns());
  }, []);

  // Seed the form from query params when arriving from /plan-wall.
  // Clears the URL afterward so a manual refresh doesn't re-seed.
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

  const config = result.derived;

  return (
    <div className="@container flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <PageHeaderSlot>
        <span className="truncate text-sm font-medium text-muted-foreground">
          Calculator
        </span>
        <div className="ml-auto flex items-center gap-2">
          <UnitToggle value={unit} onChange={handleUnitChange} />
          <PrintMenu
            sections={printSections}
            setSections={setPrintSections}
          />
        </div>
      </PageHeaderSlot>

      <div className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-4 @4xl:flex-row">
        <aside className="no-print flex min-h-0 flex-1 flex-col @4xl:w-[22rem] @4xl:flex-none">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
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
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <Tabs defaultValue="overview" className="no-print flex min-h-0 flex-1 flex-col gap-3">
            <TabsList className="w-full shrink-0 justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cutplan">Cut Plan</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="directions">Directions</TabsTrigger>
              <TabsTrigger value="print">Print preview</TabsTrigger>
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

                <TabsContent value="overview" className="mt-0 space-y-4">
                  <OverviewTab result={result} config={config} unit={unit} />
                </TabsContent>
                <TabsContent value="cutplan" className="mt-0 space-y-4">
                  <CutPlanTab result={result} unit={unit} />
                </TabsContent>
                <TabsContent value="materials" className="mt-0 space-y-4">
                  <MaterialsTab result={result} />
                </TabsContent>
                <TabsContent value="directions" className="mt-0 space-y-4">
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
