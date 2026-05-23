"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { planWall, type WallPlanOption } from "~/lib/wallPlan";
import { STYLE_PROFILES, type BenchStyleId } from "~/lib/styles";
import { formatLength, fromInches, toInches, type Unit } from "~/lib/units";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { PageHeaderSlot } from "~/components/PageHeaderSlot";

type FormState = {
  styleId: BenchStyleId;
  wallLength: number;   // in current unit
  depth: number;        // in current unit
  height: number;       // in current unit
  minLen: number;       // inches (kept in inches; advanced)
  maxLen: number;       // inches
  topLayersOverride?: 0 | 1 | 2;
};

function topLayersForStyle(id: BenchStyleId): 0 | 1 | 2 {
  const s = STYLE_PROFILES.find((x) => x.id === id);
  if (!s) return 1;
  if (s.topConstruction === "doubled-sheet") return 2;
  if (s.topConstruction === "single-sheet") return 1;
  return 0; // laminated-2x or slab — lumber top, not sheets
}

function topLayersLabel(n: 0 | 1 | 2): string {
  return n === 2 ? "doubled sheet" : n === 1 ? "single sheet" : "laminated lumber";
}

const DEFAULT_STYLE: BenchStyleId = "heavy-garage";

function defaultsForStyle(id: BenchStyleId, unit: Unit): Pick<FormState, "depth" | "height"> {
  const s = STYLE_PROFILES.find((x) => x.id === id) ?? STYLE_PROFILES[0]!;
  const conv = (i: number) => (unit === "in" ? i : Math.round(fromInches(i, unit)));
  return { depth: conv(s.defaultDepth), height: conv(s.defaultHeight) };
}

export default function PlanWallPage() {
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(() => {
    const d = defaultsForStyle(DEFAULT_STYLE, "in");
    return {
      styleId: DEFAULT_STYLE,
      wallLength: 210,
      depth: d.depth,
      height: d.height,
      minLen: 48,
      maxLen: 96,
    };
  });

  const styleTopLayers = topLayersForStyle(form.styleId);
  const topLayers: 0 | 1 | 2 = form.topLayersOverride ?? styleTopLayers;

  const options = useMemo<WallPlanOption[]>(() => {
    return planWall({
      wallLengthIn: toInches(form.wallLength, unit),
      benchDepthIn: toInches(form.depth, unit),
      topSheetLayers: topLayers,
      minBenchLengthIn: form.minLen,
      maxBenchLengthIn: form.maxLen,
    });
  }, [form, unit, topLayers]);

  const handleStyleChange = (id: BenchStyleId) => {
    const d = defaultsForStyle(id, unit);
    setForm((f) => ({ ...f, styleId: id, depth: d.depth, height: d.height }));
  };

  const u = unit === "in" ? '"' : " mm";

  return (
    <div className="@container flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      <PageHeaderSlot>
        <span className="truncate text-sm font-medium text-muted-foreground">
          Plan a wall
        </span>
      </PageHeaderSlot>

      <div className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-4 @4xl:flex-row">
        <aside className="flex min-h-0 flex-1 flex-col @4xl:w-[22rem] @4xl:flex-none">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
              <Card>
                <CardHeader>
                  <CardTitle>Wall &amp; bench size</CardTitle>
                  <CardDescription>
                    Total wall length, how deep each bench should be, and the bench style to build.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Bench style</Label>
                    <Select
                      value={form.styleId}
                      onValueChange={(v) => handleStyleChange(v as BenchStyleId)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_PROFILES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Sets the default depth &amp; height. You can override below.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Wall length"
                      suffix={u}
                      value={form.wallLength}
                      onChange={(v) => setForm({ ...form, wallLength: v })}
                    />
                    <Field
                      label="Bench depth"
                      suffix={u}
                      value={form.depth}
                      onChange={(v) => setForm({ ...form, depth: v })}
                    />
                    <Field
                      label="Bench height"
                      suffix={u}
                      value={form.height}
                      onChange={(v) => setForm({ ...form, height: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Top construction</Label>
                    <Select
                      value={form.topLayersOverride === undefined ? "style" : String(form.topLayersOverride)}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          topLayersOverride:
                            v === "style" ? undefined : (Number(v) as 0 | 1 | 2),
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="style">
                          Style default ({topLayersLabel(styleTopLayers)})
                        </SelectItem>
                        <SelectItem value="1">Single sheet (1 layer)</SelectItem>
                        <SelectItem value="2">Doubled sheet (2 layers)</SelectItem>
                        <SelectItem value="0">Laminated lumber (no sheets)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 block text-xs text-muted-foreground">
                      Length limits (inches)
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Min bench"
                        suffix={'"'}
                        value={form.minLen}
                        onChange={(v) => setForm({ ...form, minLen: v })}
                      />
                      <Field
                        label="Max bench"
                        suffix={'"'}
                        value={form.maxLen}
                        onChange={(v) => setForm({ ...form, maxLen: v })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Display units</span>
                    <div className="inline-flex overflow-hidden rounded-md border">
                      {(["in", "mm"] as const).map((un) => (
                        <button
                          key={un}
                          type="button"
                          onClick={() => {
                            if (un === unit) return;
                            const conv = (v: number) =>
                              Math.round(fromInches(toInches(v, unit), un) * 100) / 100;
                            setForm({
                              ...form,
                              wallLength: conv(form.wallLength),
                              depth: conv(form.depth),
                              height: conv(form.height),
                            });
                            setUnit(un);
                          }}
                          className={`px-3 py-1 ${
                            un === unit
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {un}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
              {options.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No valid bench layouts for that wall length within your min/max limits.
                    Try widening the limits or check your wall length.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {options.length} suggestion{options.length === 1 ? "" : "s"} ranked by
                    sheet yield, simplicity, and bench size.
                  </p>
                  <ol className="space-y-3">
                    {options.map((opt, idx) => (
                      <OptionCard
                        key={opt.label + idx}
                        option={opt}
                        rank={idx + 1}
                        styleId={form.styleId}
                        depthIn={toInches(form.depth, unit)}
                        heightIn={toInches(form.height, unit)}
                        unit={unit}
                      />
                    ))}
                  </ol>
                </>
              )}
            </div>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="pr-8"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  rank,
  styleId,
  depthIn,
  heightIn,
  unit,
}: {
  option: WallPlanOption;
  rank: number;
  styleId: BenchStyleId;
  depthIn: number;
  heightIn: number;
  unit: Unit;
}) {
  const yieldPct = Math.round(option.sheetYieldPct * 100);
  const isTop = rank === 1;

  return (
    <li>
      <Card className={isTop ? "border-primary/60 shadow-sm" : undefined}>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={isTop ? "default" : "secondary"}>#{rank}</Badge>
              {isTop && <Badge variant="outline">Recommended</Badge>}
            </div>
            <CardTitle className="mt-1 text-xl">{option.label}</CardTitle>
            <CardDescription className="mt-1">
              {option.totalBenchCount} bench{option.totalBenchCount === 1 ? "" : "es"}
              {option.sheetsForTops > 0
                ? ` • ${option.sheetsForTops} sheet${option.sheetsForTops === 1 ? "" : "s"} (yield ${yieldPct}%)`
                : " • laminated lumber top"}
            </CardDescription>
          </div>
          <div className="hidden flex-col items-end gap-2 sm:flex">
            {option.benches.map((b, i) => (
              <Button
                key={i}
                size="sm"
                variant={isTop && i === 0 ? "default" : "outline"}
                asChild
              >
                <Link
                  href={{
                    pathname: "/",
                    query: {
                      styleId,
                      topLength: b.lengthIn.toFixed(3),
                      topDepth: depthIn.toFixed(3),
                      totalHeight: heightIn.toFixed(3),
                      benchCount: b.count,
                    },
                  }}
                >
                  Build {b.count} × {formatLength(b.lengthIn, unit)}
                  <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="ml-5 list-disc text-sm text-muted-foreground">
            {option.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
            {option.benches.map((b, i) => (
              <Button
                key={i}
                size="sm"
                variant={isTop && i === 0 ? "default" : "outline"}
                asChild
              >
                <Link
                  href={{
                    pathname: "/",
                    query: {
                      styleId,
                      topLength: b.lengthIn.toFixed(3),
                      topDepth: depthIn.toFixed(3),
                      totalHeight: heightIn.toFixed(3),
                      benchCount: b.count,
                    },
                  }}
                >
                  Build {b.count} × {formatLength(b.lengthIn, unit)}
                  <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
