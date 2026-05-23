"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command as CommandIcon,
  Compass,
  DollarSign,
  Download,
  Hammer,
  Layers,
  Library,
  Package,
  Ruler,
  Scale,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import type { CalcResult, SimpleInputs } from "~/lib/types";
import { formatLength, fromInches, toInches, type Unit } from "~/lib/units";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";
import { ElevationViews } from "~/components/ElevationViews";
import { PageHeaderSlot } from "~/components/PageHeaderSlot";
import { PRESETS } from "~/lib/presets";
import { STYLE_PROFILES, type BenchStyleId, type ViseKind } from "~/lib/styles";
import {
  loadSavedDesigns,
  newDesignId,
  writeSavedDesigns,
  type SavedDesign,
} from "~/lib/storage";
import { cn } from "~/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Slider } from "~/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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

/* ====================================================================== */
/*                              HomeV3                                    */
/* ====================================================================== */

export default function HomeV3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(() => formFromInputs(DEFAULT_INPUTS));
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [designName, setDesignName] = useState("");
  const [printSections, setPrintSections] =
    useState<PrintSections>(DEFAULT_PRINT_SECTIONS);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
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

  // Command palette: cmd/ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    toast.success(`Switched to ${s.name}`, { duration: 1800 });
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
    toast.success(`Saved "${name}"`, { duration: 1800 });
  };

  const handleLoadDesign = (id: string) => {
    const d = savedDesigns.find((x) => x.id === id);
    if (!d) return;
    setUnit("in");
    setForm(formFromInputs(d.input));
    toast.message(`Loaded "${d.name}"`, { duration: 1800 });
  };

  const handleDeleteDesign = (id: string) => {
    const d = savedDesigns.find((x) => x.id === id);
    const next = savedDesigns.filter((x) => x.id !== id);
    setSavedDesigns(next);
    writeSavedDesigns(next);
    if (d) toast.warning(`Deleted "${d.name}"`, { duration: 1600 });
  };

  const handleExportJson = () => {
    const data = {
      schema: "workbench-calculator/v3",
      exportedAt: new Date().toISOString(),
      input: buildInputs(form, unit),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workbench-${(designName || "design").trim().replace(/\s+/g, "-") || "design"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported design JSON", { duration: 1600 });
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as { input?: SimpleInputs };
        if (data?.input) {
          setUnit("in");
          setForm(formFromInputs(data.input));
          toast.success(`Imported ${file.name}`, { duration: 1800 });
        }
      } catch {
        toast.error("Could not parse that JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setUnit("in");
    setForm(formFromInputs(p.input));
    toast.message(`Loaded preset "${p.name}"`, { duration: 1800 });
  };

  const railProps: ParameterRailProps = {
    form,
    setForm,
    unit,
    style,
    onStyleChange: handleStyleChange,
    designName,
    setDesignName,
    onSave: handleSaveDesign,
  };

  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "20rem" } as React.CSSProperties}
      className="h-full min-h-0"
    >
      <div className="@container flex h-full min-h-0 w-full flex-1 flex-row bg-background text-foreground">
        {/* Page header content (portals into SiteHeader outlet) */}
        <PageHeaderSlot>
          <span className="hidden truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground @sm:inline">
            WORKBENCH
          </span>
          <Badge
            variant="outline"
            className="hidden font-mono text-[10px] uppercase tracking-[0.15em] @sm:inline-flex"
          >
            v3 · workshop
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCmdOpen(true)}
                  className="hidden gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] @md:inline-flex"
                >
                  <CommandIcon className="size-3.5" />
                  Search
                  <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 text-[9px] tabular-nums text-muted-foreground @lg:inline">
                    ⌘K
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command palette · ⌘K / Ctrl+K</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLibraryOpen(true)}
                  className="gap-1.5"
                >
                  <Library className="size-3.5" />
                  <span className="hidden @md:inline">Library</span>
                  {savedDesigns.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 font-mono text-[10px]"
                    >
                      {savedDesigns.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Saved designs &amp; presets</TooltipContent>
            </Tooltip>

            <UnitToggle value={unit} onChange={handleUnitChange} />
            <PrintMenu sections={printSections} setSections={setPrintSections} />
          </div>
        </PageHeaderSlot>

        {/* Parameter rail — slides off when collapsed; auto-Sheet on mobile */}
        <Sidebar
          collapsible="offcanvas"
          className="top-14 !h-[calc(100svh-3.5rem)] border-r border-sidebar-border"
        >
          <ParameterRail {...railProps} />
        </Sidebar>

        {/* Main work area: Canvas + Output (resizable) */}
        <div className="flex min-h-0 flex-1 flex-col">
          {result.warnings.length > 0 && (
            <Alert variant="destructive" className="mx-3 mt-3 shrink-0">
              <AlertTitle className="text-xs">Calculator warnings</AlertTitle>
              <AlertDescription>
                <ul className="ml-5 list-disc text-xs">
                  {result.warnings.slice(0, 2).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {result.warnings.length > 2 && (
                    <li className="opacity-70">
                      +{result.warnings.length - 2} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-0 flex-1"
          >
            {/* CANVAS column */}
            <ResizablePanel
              id="canvas"
              defaultSize={62}
              minSize={32}
              className="flex flex-col"
            >
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel
                  id="diagram"
                  defaultSize={72}
                  minSize={40}
                  className="flex flex-col"
                >
                  <CanvasFrame
                    config={config}
                    result={result}
                    unit={unit}
                    style={style}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  id="metrics"
                  defaultSize={28}
                  minSize={16}
                  maxSize={50}
                >
                  <MetricsDeck result={result} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* OUTPUT column */}
            <ResizablePanel
              id="output"
              defaultSize={38}
              minSize={22}
              maxSize={60}
              className="hidden @2xl:flex"
            >
              <OutputRail
                result={result}
                config={config}
                unit={unit}
                printSections={printSections}
              />
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Mobile output sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="fixed bottom-4 right-4 z-40 gap-1.5 shadow-lg @2xl:hidden"
              >
                <Package className="size-4" />
                Outputs
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[28rem] max-w-[100vw] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Outputs</SheetTitle>
                <SheetDescription>
                  Cut list, materials, build steps, print.
                </SheetDescription>
              </SheetHeader>
              <OutputRail
                result={result}
                config={config}
                unit={unit}
                printSections={printSections}
              />
            </SheetContent>
          </Sheet>

          <div className="print-only">
            <PrintPreview
              result={result}
              config={config}
              unit={unit}
              sections={printSections}
            />
          </div>
        </div>
      </div>

      {/* Library sheet (right) */}
      <LibrarySheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
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

      {/* Command palette */}
      <V3CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onStyleChange={handleStyleChange}
        onLoadPreset={handleLoadPreset}
        onSave={handleSaveDesign}
        onPrint={() => window.print()}
        onToggleUnit={() => handleUnitChange(unit === "in" ? "mm" : "in")}
      />
    </SidebarProvider>
  );
}

/* ====================================================================== */
/*                          PARAMETER RAIL                                */
/* ====================================================================== */

type ParameterRailProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  unit: Unit;
  style: (typeof STYLE_PROFILES)[number];
  onStyleChange: (id: BenchStyleId) => void;
  designName: string;
  setDesignName: (s: string) => void;
  onSave: () => void;
};

function ParameterRail({
  form,
  setForm,
  unit,
  style,
  onStyleChange,
  designName,
  setDesignName,
  onSave,
}: ParameterRailProps) {
  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hammer className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground">
              Parameters
            </span>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-[9px] uppercase tracking-[0.15em]"
          >
            {style.name.split(" ")[0]}
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full">
          <Accordion
            type="multiple"
            defaultValue={["style", "dimensions", "accessories"]}
            className="divide-y divide-sidebar-border"
          >
            <RailSection
              id="style"
              label="Style"
              icon={<Compass className="size-3.5" />}
              summary={style.name}
            >
              <StylePicker
                styleId={form.styleId}
                onChange={onStyleChange}
              />
            </RailSection>

            <RailSection
              id="dimensions"
              label="Dimensions"
              icon={<Ruler className="size-3.5" />}
              summary={`${formatLength(toInches(form.topLength, unit), unit)} × ${formatLength(toInches(form.topDepth, unit), unit)} × ${formatLength(toInches(form.totalHeight, unit), unit)}`}
            >
              <DimensionSection form={form} setForm={setForm} unit={unit} style={style} />
            </RailSection>

            <RailSection
              id="quantity"
              label="Quantity"
              icon={<Layers className="size-3.5" />}
              summary={`${form.benchCount} bench${form.benchCount === 1 ? "" : "es"}`}
            >
              <div className="space-y-2">
                <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Benches to build
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[form.benchCount]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([v]) =>
                      setForm((f) => ({ ...f, benchCount: v ?? 1 }))
                    }
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono text-sm tabular-nums">
                    ×{form.benchCount}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cut list pools across benches so lumber and sheet stock tile jointly.
                </p>
              </div>
            </RailSection>

            <RailSection
              id="accessories"
              label="Accessories"
              icon={<Wrench className="size-3.5" />}
              summary={[
                form.casters && "casters",
                form.pegboard && "pegboard",
                form.drawerCount > 0 && `${form.drawerCount} drawers`,
              ]
                .filter(Boolean)
                .join(" · ") || "none"}
            >
              <div className="space-y-3">
                <ToggleRow
                  label="Locking casters"
                  description="Roll-around bench — 4×4 posts recommended"
                  checked={form.casters}
                  onChange={(v) => setForm((f) => ({ ...f, casters: v }))}
                />
                <Separator />
                <ToggleRow
                  label="Pegboard back"
                  description="Tool storage panel mounted above the top"
                  checked={form.pegboard}
                  onChange={(v) => setForm((f) => ({ ...f, pegboard: v }))}
                />
                {form.pegboard && (
                  <div className="space-y-1.5 pl-4">
                    <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Pegboard height
                    </Label>
                    <DimField
                      label=""
                      suffix={unit === "in" ? '"' : " mm"}
                      step={unit === "in" ? 1 : 10}
                      unit={unit}
                      value={form.pegboardHeight}
                      onChange={(v) => setForm((f) => ({ ...f, pegboardHeight: v }))}
                    />
                  </div>
                )}
              </div>
            </RailSection>

            <RailSection
              id="drawers"
              label="Storage"
              icon={<Package className="size-3.5" />}
              summary={
                form.drawerCount === 0
                  ? "no drawers"
                  : `${form.drawerCount} × ${form.drawerLocation === "under-top" ? "hanging" : "column"}`
              }
            >
              <DrawerSection form={form} setForm={setForm} style={style} />
            </RailSection>

            <RailSection
              id="advanced"
              label="Advanced"
              icon={<SlidersHorizontal className="size-3.5" />}
              summary={
                form.viseOverride || form.joineryOverride
                  ? "overrides active"
                  : `vise: ${prettyVise(style.vise)}`
              }
            >
              <AdvancedSection
                form={form}
                setForm={setForm}
                styleVise={style.vise}
                styleJoinery={style.joinery}
              />
            </RailSection>
          </Accordion>
          <div className="h-3" />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar/80 p-2.5 backdrop-blur">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Save current design
          </Label>
          <InputGroup>
            <InputGroupInput
              value={designName}
              placeholder="Name this design"
              onChange={(e) => setDesignName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
              }}
              className="text-sm"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="default"
                onClick={onSave}
                aria-label="Save design"
              >
                <Save className="size-3.5" />
                Save
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </SidebarFooter>
    </>
  );
}

function RailSection({
  id,
  label,
  icon,
  summary,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={id} className="border-0">
      <AccordionTrigger className="group/sec gap-2 rounded-none px-3 py-2.5 hover:bg-sidebar-accent/50 [&[data-state=open]]:bg-sidebar-accent/30">
        <div className="flex flex-1 flex-col items-start gap-0.5 text-left">
          <div className="flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground group-hover/sec:text-foreground">
              {icon}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
              {label}
            </span>
          </div>
          {summary && (
            <span className="ml-5 truncate text-[11px] text-muted-foreground">
              {summary}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

function StylePicker({
  styleId,
  onChange,
}: {
  styleId: BenchStyleId;
  onChange: (id: BenchStyleId) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {STYLE_PROFILES.map((s) => {
        const active = s.id === styleId;
        return (
          <HoverCard key={s.id} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(s.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-sidebar-border bg-sidebar hover:border-foreground/30 hover:bg-sidebar-accent/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold leading-tight">
                    {s.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    {s.defaultLength}″ · {prettyVise(s.vise)}
                  </div>
                </div>
                {active && (
                  <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="start"
              className="w-72 border-border bg-popover text-popover-foreground"
            >
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.useCase}</div>
                </div>
                <Separator />
                <div className="space-y-1.5 text-xs">
                  <Row k="Default" v={`${s.defaultLength}″ × ${s.defaultDepth}″ × ${s.defaultHeight}″`} />
                  <Row k="Joinery" v={s.joinery} />
                  <Row k="Vise" v={prettyVise(s.vise)} />
                  <Row k="Knockdown" v={s.knockdown ? "yes" : "no"} />
                </div>
                <Separator />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {s.blurb}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {k}
      </span>
      <span className="truncate text-right font-medium">{v}</span>
    </div>
  );
}

function DimensionSection({
  form,
  setForm,
  unit,
  style,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  unit: Unit;
  style: (typeof STYLE_PROFILES)[number];
}) {
  const [lenMin, lenMax] = style.lengthRange;
  const [depMin, depMax] = style.depthRange;
  const [hMin, hMax] = style.heightRange;
  const conv = (i: number) => (unit === "in" ? i : Math.round(fromInches(i, unit)));
  const u = unit === "in" ? '"' : " mm";

  return (
    <div className="space-y-4">
      <DimScrubber
        label="Length"
        hint={`Range ${conv(lenMin)}–${conv(lenMax)}${u}`}
        suffix={u}
        unit={unit}
        min={conv(lenMin)}
        max={conv(lenMax)}
        value={form.topLength}
        onChange={(v) => setForm((f) => ({ ...f, topLength: v }))}
      />
      <DimScrubber
        label="Depth"
        hint={`Range ${conv(depMin)}–${conv(depMax)}${u}`}
        suffix={u}
        unit={unit}
        min={conv(depMin)}
        max={conv(depMax)}
        value={form.topDepth}
        onChange={(v) => setForm((f) => ({ ...f, topDepth: v }))}
      />
      <DimScrubber
        label="Height"
        hint={`Range ${conv(hMin)}–${conv(hMax)}${u}`}
        suffix={u}
        unit={unit}
        min={conv(hMin)}
        max={conv(hMax)}
        value={form.totalHeight}
        onChange={(v) => setForm((f) => ({ ...f, totalHeight: v }))}
      />
    </div>
  );
}

function DimScrubber({
  label,
  hint,
  suffix,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  suffix: string;
  unit: Unit;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const step = unit === "in" ? 0.25 : 1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {hint}
        </span>
      </div>
      <DimField
        label=""
        suffix={suffix}
        step={step}
        unit={unit}
        value={value}
        onChange={onChange}
      />
      <Slider
        value={[Math.min(Math.max(value, min), max)]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => {
          if (typeof v === "number") onChange(v);
        }}
        className="pt-1"
      />
    </div>
  );
}

function DrawerSection({
  form,
  setForm,
  style,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  style: (typeof STYLE_PROFILES)[number];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Drawers
        </Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[form.drawerCount]}
            min={0}
            max={6}
            step={1}
            onValueChange={([v]) =>
              setForm((f) => ({ ...f, drawerCount: v ?? 0 }))
            }
            className="flex-1"
          />
          <span className="w-8 text-right font-mono text-sm tabular-nums">
            {form.drawerCount}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Style default: {style.defaultDrawerCount ?? 0}
        </p>
      </div>
      {form.drawerCount > 0 && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Location
            </Label>
            <Select
              value={form.drawerLocation}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  drawerLocation: v as FormState["drawerLocation"],
                }))
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
            <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Slide type
            </Label>
            <Select
              value={form.drawerSlideType}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  drawerSlideType: v as FormState["drawerSlideType"],
                }))
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
        </>
      )}
    </div>
  );
}

function AdvancedSection({
  form,
  setForm,
  styleVise,
  styleJoinery,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  styleVise: ViseKind;
  styleJoinery: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Vise
        </Label>
        <Select
          value={form.viseOverride ?? "style-default"}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              viseOverride: v === "style-default" ? undefined : (v as ViseKind),
            }))
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
        <Label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Joinery
        </Label>
        <Select
          value={form.joineryOverride ?? "style-default"}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              joineryOverride:
                v === "style-default"
                  ? undefined
                  : (v as FormState["joineryOverride"]),
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="style-default">
              Style default ({styleJoinery})
            </SelectItem>
            <SelectItem value="pocket">Pocket screws</SelectItem>
            <SelectItem value="lag">Lag bolts</SelectItem>
            <SelectItem value="mortise">Mortise &amp; tenon</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*                          CANVAS FRAME                                  */
/* ====================================================================== */

function CanvasFrame({
  config,
  result,
  unit,
  style,
}: {
  config: CalcResult["derived"];
  result: CalcResult;
  unit: Unit;
  style: (typeof STYLE_PROFILES)[number];
}) {
  const s = result.stability;
  const verdictTone = {
    solid: "border-success/40 bg-success/10 text-success",
    acceptable: "border-accent/50 bg-accent/15 text-accent-foreground",
    marginal: "border-warning/40 bg-warning/15 text-warning",
    unstable: "border-destructive/40 bg-destructive/15 text-destructive",
  }[s.verdict];
  const verdictLabel = {
    solid: "Solid build",
    acceptable: "Acceptable",
    marginal: "Marginal",
    unstable: "Unstable",
  }[s.verdict];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Blueprint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "center center",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.0) 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.0) 75%)",
        }}
      />

      {/* Corner crosshairs */}
      <CornerMarks />

      {/* Floating chips */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
        <FloatingChip className={cn("border", verdictTone)}>
          <span className="size-1.5 rounded-full bg-current" />
          {verdictLabel}
          <span className="ml-1 font-mono text-[10px] opacity-70">
            {s.score}/100
          </span>
        </FloatingChip>
        <FloatingChip>
          <Compass className="size-3" />
          {style.name}
        </FloatingChip>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
        {result.totals.estimatedCost !== undefined && (
          <FloatingChip>
            <DollarSign className="size-3" />
            <span className="font-mono tabular-nums">
              {result.totals.estimatedCost.toFixed(0)}
            </span>
          </FloatingChip>
        )}
        <FloatingChip>
          <Scale className="size-3" />
          <span className="font-mono tabular-nums">
            {s.baseWeightLb.toFixed(0)} lb
          </span>
        </FloatingChip>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10">
        <FloatingChip>
          <Ruler className="size-3" />
          <span className="font-mono tabular-nums">
            {formatLength(config.topLength, unit)} × {formatLength(config.topDepth, unit)} × {formatLength(config.totalHeight, unit)}
          </span>
        </FloatingChip>
      </div>

      {/* Diagram stack */}
      <ScrollArea className="relative z-0 h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 @sm:p-6 @lg:p-8">
          <div className="rounded-md border border-border/40 bg-card/40 p-3 backdrop-blur-sm">
            <SectionHeading icon={<Square className="size-3" />} label="Isometric" />
            <BenchIsoDiagram config={config} unit={unit} />
          </div>
          <div className="rounded-md border border-border/40 bg-card/40 p-3 backdrop-blur-sm">
            <SectionHeading icon={<Layers className="size-3" />} label="Elevations" />
            <ElevationViews config={config} unit={unit} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function CornerMarks() {
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 size-3 border-l border-t border-border" />
      <div className="pointer-events-none absolute right-2 top-2 size-3 border-r border-t border-border" />
      <div className="pointer-events-none absolute bottom-2 left-2 size-3 border-b border-l border-border" />
      <div className="pointer-events-none absolute bottom-2 right-2 size-3 border-b border-r border-border" />
    </>
  );
}

function FloatingChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-card/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
        {label}
      </span>
      <div className="ml-1 h-px flex-1 bg-border" />
    </div>
  );
}

/* ====================================================================== */
/*                          METRICS DECK                                  */
/* ====================================================================== */

function MetricsDeck({ result }: { result: CalcResult }) {
  const s = result.stability;
  const cost = result.totals.estimatedCost;

  const tiles: DeckTile[] = [
    {
      label: "Top sag",
      value: `${s.topSagInches.toFixed(2)}"`,
      sub: `limit ${s.topSagLimitInches.toFixed(2)}"`,
      ok: s.topSagInches <= s.topSagLimitInches,
      tip: "Vertical deflection at center of top under a 200 lb point load.",
    },
    {
      label: "Racking",
      value: `${s.rackingResistanceLbf.toFixed(0)}`,
      sub: "lbf lateral",
      ok: s.rackingResistanceLbf > 200,
      tip: "Resistance to side-to-side push. Floor stretchers contribute most.",
    },
    {
      label: "Footprint",
      value: s.tipRatio.toFixed(2),
      sub: "width / height",
      ok: s.tipRatio >= 0.45,
      tip: "Tip-over ratio. Below 0.45 the bench feels top-heavy.",
    },
    {
      label: "Weight",
      value: `${s.baseWeightLb.toFixed(0)}`,
      sub: "lb assembled",
      ok: s.baseWeightLb > 50,
      tip: "Mass anchors the bench during planing. Lighter benches walk.",
    },
    {
      label: "Lumber",
      value: `${result.totals.lumberFt.toFixed(0)}`,
      sub: "linear ft",
      ok: true,
      tip: `${result.lumberBoards.length} board${result.lumberBoards.length === 1 ? "" : "s"}`,
    },
    {
      label: "Cost",
      value: cost !== undefined ? `$${cost.toFixed(0)}` : "—",
      sub: "est. materials",
      ok: true,
      tip: "Estimated total materials and hardware.",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border bg-muted/20">
      <div className="flex items-center gap-2 px-3 pb-1 pt-2">
        <SlidersHorizontal className="size-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Metrics
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 gap-2 p-3 @sm:grid-cols-3 @lg:grid-cols-6">
          {tiles.map((t) => (
            <DeckCell key={t.label} {...t} />
          ))}
        </div>
        {s.warnings.length > 0 && (
          <div className="mx-3 mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
            <span className="font-semibold">⚠ </span>
            {s.warnings[0]}
            {s.warnings.length > 1 && (
              <span className="opacity-70"> · +{s.warnings.length - 1} more</span>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

type DeckTile = {
  label: string;
  value: string;
  sub: string;
  ok: boolean;
  tip: string;
};

function DeckCell({ label, value, sub, ok, tip }: DeckTile) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group/cell flex flex-col gap-0.5 rounded-md border bg-card/70 px-2.5 py-2 transition hover:bg-card",
            ok
              ? "border-border"
              : "border-destructive/40 bg-destructive/10 hover:bg-destructive/15",
          )}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </div>
          <div className="font-mono text-base font-semibold leading-none tabular-nums">
            {value}
          </div>
          <div className="text-[10px] text-muted-foreground">{sub}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[14rem] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

/* ====================================================================== */
/*                          OUTPUT RAIL                                   */
/* ====================================================================== */

function OutputRail({
  result,
  config,
  unit,
  printSections,
}: {
  result: CalcResult;
  config: CalcResult["derived"];
  unit: Unit;
  printSections: PrintSections;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col border-l border-border">
      <Tabs defaultValue="spec" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="m-2 mb-0 grid shrink-0 grid-cols-5 gap-0 p-0.5">
          <TabsTrigger
            value="spec"
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Spec
          </TabsTrigger>
          <TabsTrigger
            value="cuts"
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Cuts
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Mats
          </TabsTrigger>
          <TabsTrigger
            value="build"
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Build
          </TabsTrigger>
          <TabsTrigger
            value="print"
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Print
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-3 pr-4">
            <TabsContent value="spec" className="mt-0 space-y-3">
              <StabilityCard result={result} />
              <SpecCard config={config} result={result} unit={unit} />
              <DesignNotesCard config={config} />
            </TabsContent>
            <TabsContent value="cuts" className="mt-0 space-y-3">
              <CutPlanTab result={result} unit={unit} />
            </TabsContent>
            <TabsContent value="materials" className="mt-0 space-y-3">
              <MaterialsTab result={result} />
            </TabsContent>
            <TabsContent value="build" className="mt-0 space-y-3">
              <DirectionsTab result={result} />
            </TabsContent>
            <TabsContent value="print" className="mt-0 space-y-3">
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
    </div>
  );
}

/* ====================================================================== */
/*                          LIBRARY SHEET                                 */
/* ====================================================================== */

function LibrarySheet({
  open,
  onOpenChange,
  designs,
  designName,
  setDesignName,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImport,
  onLoadPreset,
  fileInputRef,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[24rem] flex-col p-0 sm:max-w-[24rem]">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-mono text-[11px] uppercase tracking-[0.18em]">
            Library
          </SheetTitle>
          <SheetDescription className="text-xs">
            Saved designs and built-in presets.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="saved" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-3 grid shrink-0 grid-cols-2">
            <TabsTrigger
              value="saved"
              className="font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              Saved
              {designs.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 font-mono text-[9px]">
                  {designs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="presets"
              className="font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              Built-in
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="space-y-2 p-3">
              <Label className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Save current design
              </Label>
              <InputGroup>
                <InputGroupInput
                  value={designName}
                  placeholder="Name this design"
                  onChange={(e) => setDesignName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSave();
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={onSave} variant="default">
                    <Save className="size-3.5" />
                    Save
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <Separator />

            <ScrollArea className="min-h-0 flex-1">
              {designs.length > 0 ? (
                <div className="space-y-1 p-3">
                  {designs.map((d) => (
                    <HoverCard key={d.id} openDelay={250}>
                      <HoverCardTrigger asChild>
                        <div className="group/saved flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm hover:border-primary/40">
                          <button
                            type="button"
                            onClick={() => onLoad(d.id)}
                            className="flex-1 truncate text-left hover:text-primary"
                          >
                            {d.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${d.name}`}
                            onClick={() => onDelete(d.id)}
                            className="size-6 shrink-0 text-muted-foreground opacity-0 transition group-hover/saved:opacity-100 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="left" className="w-64">
                        <div className="space-y-1.5">
                          <div className="font-semibold">{d.name}</div>
                          <Row k="Style" v={d.input.styleId} />
                          <Row
                            k="Size"
                            v={`${d.input.topLength}″ × ${d.input.topDepth}″ × ${d.input.totalHeight}″`}
                          />
                          <Row
                            k="Saved"
                            v={new Date(d.savedAt).toLocaleDateString()}
                          />
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              ) : (
                <div className="m-3 rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                  No saved designs yet — save one above.
                </div>
              )}
            </ScrollArea>

            <Separator />

            <div className="grid grid-cols-2 gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="gap-1.5"
              >
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

          <TabsContent value="presets" className="mt-0 flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1.5 p-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onLoadPreset(p.id);
                      onOpenChange(false);
                    }}
                    className="block w-full rounded-md border border-border bg-card px-2.5 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="line-clamp-2 text-[11px] text-muted-foreground">
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ====================================================================== */
/*                       COMMAND PALETTE                                  */
/* ====================================================================== */

function V3CommandPalette({
  open,
  onOpenChange,
  onStyleChange,
  onLoadPreset,
  onSave,
  onPrint,
  onToggleUnit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStyleChange: (id: BenchStyleId) => void;
  onLoadPreset: (id: string) => void;
  onSave: () => void;
  onPrint: () => void;
  onToggleUnit: () => void;
}) {
  const close = () => onOpenChange(false);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search styles, presets, and actions."
    >
      <CommandInput placeholder="Search styles, presets, actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onSave();
              close();
            }}
          >
            <Save className="size-4" />
            <span>Save current design</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onToggleUnit();
              close();
            }}
          >
            <Ruler className="size-4" />
            <span>Toggle units (in / mm)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onPrint();
              close();
            }}
          >
            <Package className="size-4" />
            <span>Print build sheet</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Bench styles">
          {STYLE_PROFILES.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.name} ${s.useCase} ${s.id}`}
              onSelect={() => {
                onStyleChange(s.id);
                close();
              }}
            >
              <Compass className="size-4" />
              <span>{s.name}</span>
              <span className="ml-auto truncate text-[10px] text-muted-foreground">
                {s.useCase}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Built-in presets">
          {PRESETS.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.name} ${p.description} preset`}
              onSelect={() => {
                onLoadPreset(p.id);
                close();
              }}
            >
              <Library className="size-4" />
              <span>{p.name}</span>
              <span className="ml-auto truncate text-[10px] text-muted-foreground">
                {p.description}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
