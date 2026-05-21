import Head from "next/head";
import { useMemo, useState } from "react";
import { LUMBER, SHEETS } from "~/lib/materials";
import { calculate } from "~/lib/calculator";
import type { BenchConfig, Joinery } from "~/lib/types";
import { formatLength, fromInches, toInches, type Unit } from "~/lib/units";
import { LumberDiagram } from "~/components/LumberDiagram";
import { SheetDiagram } from "~/components/SheetDiagram";
import { BenchIsoDiagram } from "~/components/BenchIsoDiagram";

type Tab = "overview" | "cutplan" | "materials" | "directions" | "print";

type FormState = {
  topLength: number;
  topWidth: number;
  totalHeight: number;
  overhang: number;
  shelfHeight: number;
  kerf: number;
  legMaterialId: string;
  apronMaterialId: string;
  topMaterialId: string;
  shelfMaterialId: string;
  pegboardMaterialId: string;
  includeShelf: boolean;
  middleStretcher: boolean;
  doubledTop: boolean;
  casters: boolean;
  pegboard: boolean;
  pegboardHeight: number;
  toolWell: boolean;
  toolWellWidth: number;
  diagonalBraces: boolean;
  edgeBand: boolean;
  finishCoats: number;
  joinery: Joinery;
  stockLengthPreference: number | "any";
  customStockEnabled: boolean;
  customStockInches: number;
  customStockPricePerFt: number;
};

const DEFAULTS_INCH: FormState = {
  topLength: 60,
  topWidth: 24,
  totalHeight: 36,
  overhang: 1,
  shelfHeight: 10,
  kerf: 0.125,
  legMaterialId: "4x4",
  apronMaterialId: "2x4",
  topMaterialId: "ply_3_4",
  shelfMaterialId: "ply_1_2",
  pegboardMaterialId: "hdb_1_4",
  includeShelf: true,
  middleStretcher: false,
  doubledTop: false,
  casters: false,
  pegboard: false,
  pegboardHeight: 24,
  toolWell: false,
  toolWellWidth: 4,
  diagonalBraces: false,
  edgeBand: true,
  finishCoats: 2,
  joinery: "pocket",
  stockLengthPreference: "any",
  customStockEnabled: false,
  customStockInches: 96,
  customStockPricePerFt: 1.0,
};

export default function Home() {
  const [unit, setUnit] = useState<Unit>("in");
  const [form, setForm] = useState<FormState>(DEFAULTS_INCH);
  const [tab, setTab] = useState<Tab>("overview");

  const handleUnitChange = (newUnit: Unit) => {
    if (newUnit === unit) return;
    setForm((f) => ({
      ...f,
      topLength: round(fromInches(toInches(f.topLength, unit), newUnit)),
      topWidth: round(fromInches(toInches(f.topWidth, unit), newUnit)),
      totalHeight: round(fromInches(toInches(f.totalHeight, unit), newUnit)),
      overhang: round(fromInches(toInches(f.overhang, unit), newUnit)),
      shelfHeight: round(fromInches(toInches(f.shelfHeight, unit), newUnit)),
      pegboardHeight: round(fromInches(toInches(f.pegboardHeight, unit), newUnit)),
      toolWellWidth: round(fromInches(toInches(f.toolWellWidth, unit), newUnit)),
      kerf: roundFine(fromInches(toInches(f.kerf, unit), newUnit)),
      customStockInches: round(fromInches(toInches(f.customStockInches, unit), newUnit)),
    }));
    setUnit(newUnit);
  };

  const config: BenchConfig = useMemo(
    () => ({
      topLength: toInches(form.topLength, unit),
      topWidth: toInches(form.topWidth, unit),
      totalHeight: toInches(form.totalHeight, unit),
      overhang: toInches(form.overhang, unit),
      shelfHeight: toInches(form.shelfHeight, unit),
      kerf: toInches(form.kerf, unit),
      legMaterialId: form.legMaterialId,
      apronMaterialId: form.apronMaterialId,
      topMaterialId: form.topMaterialId,
      shelfMaterialId: form.shelfMaterialId,
      pegboardMaterialId: form.pegboardMaterialId,
      includeShelf: form.includeShelf,
      middleStretcher: form.middleStretcher,
      doubledTop: form.doubledTop,
      casters: form.casters,
      pegboard: form.pegboard,
      pegboardHeight: toInches(form.pegboardHeight, unit),
      toolWell: form.toolWell,
      toolWellWidth: toInches(form.toolWellWidth, unit),
      diagonalBraces: form.diagonalBraces,
      edgeBand: form.edgeBand,
      finishCoats: form.finishCoats,
      joinery: form.joinery,
      stockLengthPreference: form.customStockEnabled
        ? toInches(form.customStockInches, unit)
        : form.stockLengthPreference,
      customLumberPricePerFt: form.customStockEnabled
        ? form.customStockPricePerFt
        : undefined,
    }),
    [form, unit],
  );

  const result = useMemo(() => calculate(config), [config]);

  const legHeightApprox = useMemo(() => {
    const top = SHEETS.find((s) => s.id === form.topMaterialId);
    const t = (top?.thickness ?? 0.75) * (form.doubledTop ? 2 : 1);
    const caster = form.casters ? 3 : 0;
    return Math.max(1, toInches(form.totalHeight, unit) - t - caster);
  }, [form, unit]);

  const u = unit === "in" ? '"' : " mm";

  return (
    <>
      <Head>
        <title>Workbench Calculator — full cut plan, materials, directions</title>
        <meta
          name="description"
          content="Pick standard lumber + sheet goods or enter custom stock, set bench dimensions, and get a printable cut list with cutting diagrams, materials list, hardware, and step-by-step build directions."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-stone-100 text-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <header className="no-print mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Workbench Calculator</h1>
              <p className="text-sm text-stone-600">
                Set dimensions, pick standard or custom lumber, get a printable cut
                plan, materials list, and step-by-step build directions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
              >
                Print build sheet
              </button>
              <div className="inline-flex overflow-hidden rounded-md border border-stone-300 bg-white text-sm">
                <button
                  type="button"
                  onClick={() => handleUnitChange("in")}
                  className={`px-3 py-1.5 ${
                    unit === "in"
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  in
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange("mm")}
                  className={`px-3 py-1.5 ${
                    unit === "mm"
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  mm
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[24rem_1fr]">
            {/* INPUTS */}
            <section className="no-print space-y-5 rounded-lg border border-stone-200 bg-white p-5 shadow-sm self-start lg:sticky lg:top-4">
              <Inputs form={form} setForm={setForm} unitSuffix={u} unit={unit} />
            </section>

            {/* RESULTS */}
            <section>
              {/* Tab bar */}
              <div className="no-print mb-4 flex flex-wrap gap-1 border-b border-stone-200">
                {(
                  [
                    ["overview", "Overview"],
                    ["cutplan", "Cut Plan"],
                    ["materials", "Materials"],
                    ["directions", "Directions"],
                    ["print", "Print preview"],
                  ] as [Tab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                      tab === id
                        ? "border-stone-900 font-semibold text-stone-900"
                        : "border-transparent text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-900">Warnings</h3>
                  <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Overview */}
              {tab === "overview" && (
                <OverviewTab
                  result={result}
                  config={config}
                  legHeight={legHeightApprox}
                  unit={unit}
                />
              )}

              {tab === "cutplan" && <CutPlanTab result={result} unit={unit} />}

              {tab === "materials" && (
                <MaterialsTab result={result} unit={unit} />
              )}

              {tab === "directions" && (
                <DirectionsTab result={result} unit={unit} />
              )}

              {tab === "print" && (
                <PrintPreview
                  result={result}
                  config={config}
                  legHeight={legHeightApprox}
                  unit={unit}
                />
              )}

              {/* When printing, render full document regardless of tab */}
              <div className="print-only">
                <PrintPreview
                  result={result}
                  config={config}
                  legHeight={legHeightApprox}
                  unit={unit}
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
/*                                Inputs                                  */
/* ====================================================================== */

function Inputs({
  form,
  setForm,
  unitSuffix,
  unit,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  unitSuffix: string;
  unit: Unit;
}) {
  return (
    <>
      <details open className="group">
        <summary className="cursor-pointer list-none">
          <h2 className="inline text-lg font-semibold">Dimensions</h2>
          <span className="ml-2 text-xs text-stone-500 group-open:hidden">click to expand</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumField
            label="Top length (W)"
            hint="along the front"
            suffix={unitSuffix}
            value={form.topLength}
            onChange={(v) => setForm({ ...form, topLength: v })}
          />
          <NumField
            label="Top depth (D)"
            hint="front-to-back"
            suffix={unitSuffix}
            value={form.topWidth}
            onChange={(v) => setForm({ ...form, topWidth: v })}
          />
          <NumField
            label="Total height (H)"
            hint="floor to top"
            suffix={unitSuffix}
            value={form.totalHeight}
            onChange={(v) => setForm({ ...form, totalHeight: v })}
          />
          <NumField
            label="Top overhang"
            hint="each side, past legs"
            suffix={unitSuffix}
            value={form.overhang}
            onChange={(v) => setForm({ ...form, overhang: v })}
          />
        </div>
      </details>

      <details open>
        <summary className="cursor-pointer list-none">
          <h2 className="inline text-lg font-semibold">Materials</h2>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SelectField
            label="Legs"
            value={form.legMaterialId}
            onChange={(v) => setForm({ ...form, legMaterialId: v })}
            options={LUMBER.map((l) => ({ value: l.id, label: l.label }))}
          />
          <SelectField
            label="Aprons / stretchers"
            value={form.apronMaterialId}
            onChange={(v) => setForm({ ...form, apronMaterialId: v })}
            options={LUMBER.map((l) => ({ value: l.id, label: l.label }))}
          />
          <SelectField
            label="Top"
            value={form.topMaterialId}
            onChange={(v) => setForm({ ...form, topMaterialId: v })}
            options={SHEETS.map((s) => ({ value: s.id, label: s.label }))}
          />
          <SelectField
            label="Lower shelf"
            value={form.shelfMaterialId}
            onChange={(v) => setForm({ ...form, shelfMaterialId: v })}
            options={SHEETS.map((s) => ({ value: s.id, label: s.label }))}
            disabled={!form.includeShelf}
          />
          <SelectField
            label="Pegboard sheet"
            value={form.pegboardMaterialId}
            onChange={(v) => setForm({ ...form, pegboardMaterialId: v })}
            options={SHEETS.map((s) => ({ value: s.id, label: s.label }))}
            disabled={!form.pegboard}
          />
        </div>

        <div className="mt-4 rounded border border-stone-200 bg-stone-50 p-3">
          <CheckField
            label="Use custom lumber stock length"
            checked={form.customStockEnabled}
            onChange={(v) => setForm({ ...form, customStockEnabled: v })}
          />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <NumField
              label="Custom stock length"
              hint="single board length you can buy"
              suffix={unitSuffix}
              value={form.customStockInches}
              onChange={(v) => setForm({ ...form, customStockInches: v })}
              disabled={!form.customStockEnabled}
            />
            <NumField
              label="Custom price"
              hint="$/ft (estimate)"
              value={form.customStockPricePerFt}
              step={0.05}
              onChange={(v) => setForm({ ...form, customStockPricePerFt: v })}
              disabled={!form.customStockEnabled}
            />
          </div>
          {!form.customStockEnabled && (
            <div className="mt-2">
              <SelectField
                label="Stock length preference"
                value={String(form.stockLengthPreference)}
                onChange={(v) =>
                  setForm({
                    ...form,
                    stockLengthPreference: v === "any" ? "any" : Number(v),
                  })
                }
                options={[
                  { value: "any", label: "Any (optimize)" },
                  { value: "96", label: "8 ft (96\")" },
                  { value: "120", label: "10 ft (120\")" },
                  { value: "144", label: "12 ft (144\")" },
                  { value: "168", label: "14 ft (168\")" },
                  { value: "192", label: "16 ft (192\")" },
                ]}
              />
            </div>
          )}
        </div>
      </details>

      <details open>
        <summary className="cursor-pointer list-none">
          <h2 className="inline text-lg font-semibold">Joinery</h2>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {(
            [
              ["pocket", "Pocket screws", "Beginner-friendly Kreg jig — fast and strong"],
              ["lag", 'Lag bolts 3/8" x 4"', "Heavy-duty bolted joinery"],
              ["mortise", "Mortise + tenon", "Traditional joinery, requires more tools"],
            ] as [Joinery, string, string][]
          ).map(([j, label, sub]) => (
            <label
              key={j}
              className={`flex cursor-pointer items-start gap-2 rounded border p-2 ${
                form.joinery === j
                  ? "border-stone-900 bg-stone-100"
                  : "border-stone-200 hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name="joinery"
                checked={form.joinery === j}
                onChange={() => setForm({ ...form, joinery: j })}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-stone-500">{sub}</div>
              </div>
            </label>
          ))}
        </div>
      </details>

      <details open>
        <summary className="cursor-pointer list-none">
          <h2 className="inline text-lg font-semibold">Add-ons</h2>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <CheckField
            label="Lower shelf"
            checked={form.includeShelf}
            onChange={(v) => setForm({ ...form, includeShelf: v })}
          />
          <NumField
            label="Shelf height"
            hint="from floor"
            suffix={unitSuffix}
            value={form.shelfHeight}
            onChange={(v) => setForm({ ...form, shelfHeight: v })}
            disabled={!form.includeShelf}
          />
          <CheckField
            label="Center stretcher"
            checked={form.middleStretcher}
            onChange={(v) => setForm({ ...form, middleStretcher: v })}
          />
          <CheckField
            label="Doubled-thick top"
            checked={form.doubledTop}
            onChange={(v) => setForm({ ...form, doubledTop: v })}
          />
          <CheckField
            label="Casters (4)"
            checked={form.casters}
            onChange={(v) => setForm({ ...form, casters: v })}
          />
          <CheckField
            label="Diagonal braces"
            checked={form.diagonalBraces}
            onChange={(v) => setForm({ ...form, diagonalBraces: v })}
          />
          <CheckField
            label="Pegboard back"
            checked={form.pegboard}
            onChange={(v) => setForm({ ...form, pegboard: v })}
          />
          <NumField
            label="Pegboard height"
            suffix={unitSuffix}
            value={form.pegboardHeight}
            onChange={(v) => setForm({ ...form, pegboardHeight: v })}
            disabled={!form.pegboard}
          />
          <CheckField
            label="Tool well in top"
            checked={form.toolWell}
            onChange={(v) => setForm({ ...form, toolWell: v })}
          />
          <NumField
            label="Tool well width"
            suffix={unitSuffix}
            value={form.toolWellWidth}
            onChange={(v) => setForm({ ...form, toolWellWidth: v })}
            disabled={!form.toolWell}
          />
          <CheckField
            label="Edge band plywood top"
            checked={form.edgeBand}
            onChange={(v) => setForm({ ...form, edgeBand: v })}
          />
        </div>
      </details>

      <details>
        <summary className="cursor-pointer list-none">
          <h2 className="inline text-lg font-semibold">Finishing + saw</h2>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumField
            label="Finish coats"
            value={form.finishCoats}
            step={1}
            onChange={(v) =>
              setForm({ ...form, finishCoats: Math.max(0, Math.round(v)) })
            }
          />
          <NumField
            label="Saw kerf"
            hint="blade thickness"
            suffix={unitSuffix}
            value={form.kerf}
            step={unit === "in" ? 0.0625 : 0.1}
            onChange={(v) => setForm({ ...form, kerf: v })}
          />
        </div>
      </details>

      <div>
        <button
          type="button"
          onClick={() => setForm(DEFAULTS_INCH)}
          className="text-sm text-stone-600 underline hover:text-stone-900"
        >
          Reset to defaults
        </button>
      </div>
    </>
  );
}

/* ====================================================================== */
/*                              Tab content                               */
/* ====================================================================== */

function OverviewTab({
  result,
  config,
  legHeight,
  unit,
}: {
  result: ReturnType<typeof calculate>;
  config: BenchConfig;
  legHeight: number;
  unit: Unit;
}) {
  return (
    <div className="space-y-4">
      <BenchIsoDiagram config={config} legHeight={legHeight} unit={unit} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Lumber"
          value={`${result.totals.lumberFt.toFixed(1)} ft`}
        />
        <Stat
          label="Sheet goods"
          value={`${result.totals.sheetSqFt.toFixed(1)} sq ft`}
        />
        <Stat
          label="Finish surface"
          value={`${result.totals.surfaceAreaSqFt.toFixed(0)} sq ft`}
        />
        <Stat
          label="Approx. weight"
          value={`${result.totals.weightLb.toFixed(0)} lb`}
        />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Cut list</h2>
        <CutListTable rows={result.cutList} unit={unit} />
      </div>

      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <h3 className="font-semibold text-emerald-900">
          Estimated total material cost
        </h3>
        <p className="mt-1 text-3xl font-bold text-emerald-900">
          {result.totals.estimatedCost !== undefined
            ? `$${result.totals.estimatedCost.toFixed(2)}`
            : "—"}
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Includes lumber + sheet goods + screws + glue + finish + sandpaper{" "}
          {config.casters && "+ casters "} (rough averages — confirm at your store).
        </p>
      </div>
    </div>
  );
}

function CutPlanTab({
  result,
  unit,
}: {
  result: ReturnType<typeof calculate>;
  unit: Unit;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Cut list</h2>
        <CutListTable rows={result.cutList} unit={unit} />
      </div>

      {result.lumberBoards.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Lumber cut diagrams — board by board
          </h2>
          <p className="mb-3 text-sm text-stone-600">
            Each board is drawn to scale. Cut at the dashed lines (saw kerf). The
            color-coded segments map to part codes in the cut list.
          </p>
          <div className="space-y-3">
            {result.lumberBoards.map((b, i) => (
              <LumberDiagram key={i} board={b} index={i} unit={unit} />
            ))}
          </div>
        </div>
      )}

      {result.sheetLayouts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Sheet cut layouts — full 4×8 sheets
          </h2>
          <p className="mb-3 text-sm text-stone-600">
            Each sheet shown to scale. Cut on a sacrificial sheet of foam. Track
            saw or circular saw + straight-edge gives the cleanest results.
          </p>
          <div className="space-y-3">
            {result.sheetLayouts.map((l, i) => (
              <SheetDiagram key={i} layout={l} index={i} unit={unit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialsTab({
  result,
  unit,
}: {
  result: ReturnType<typeof calculate>;
  unit: Unit;
}) {
  void unit;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Shopping list</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Item</th>
              <th className="pb-2">Notes</th>
              <th className="pb-2 text-right">~Cost</th>
            </tr>
          </thead>
          <tbody>
            {result.hardware.map((h, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0">
                <td className="py-2 font-medium">
                  {h.qty}
                  {h.unit ? ` ${h.unit}` : ""}
                </td>
                <td className="py-2">{h.itemLabel}</td>
                <td className="py-2 text-xs text-stone-600">{h.note ?? ""}</td>
                <td className="py-2 text-right font-mono text-xs">
                  {h.estimatedCost !== undefined
                    ? `$${h.estimatedCost.toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-stone-300 font-semibold">
              <td className="py-2"></td>
              <td className="py-2">Total estimated</td>
              <td></td>
              <td className="py-2 text-right font-mono">
                {result.totals.estimatedCost !== undefined
                  ? `$${result.totals.estimatedCost.toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-stone-500">
          Cost estimates are typical big-box pricing — verify at checkout. Hardware
          counts include reasonable extras for dropped/stripped screws.
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Tools required</h2>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {result.tools.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  t.required ? "bg-rose-500" : "bg-stone-400"
                }`}
                aria-label={t.required ? "required" : "optional"}
              />
              <span>
                <span className={t.required ? "font-medium" : ""}>{t.name}</span>
                {t.note && (
                  <span className="text-xs text-stone-500"> — {t.note}</span>
                )}
                {!t.required && (
                  <span className="text-xs italic text-stone-400"> (optional)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DirectionsTab({
  result,
  unit,
}: {
  result: ReturnType<typeof calculate>;
  unit: Unit;
}) {
  void unit;
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Build directions</h2>
      <ol className="space-y-4">
        {result.steps.map((s) => (
          <li
            key={s.n}
            className="rounded border border-stone-100 bg-stone-50 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">
                {s.n}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-stone-700">{s.body}</p>
                {(s.fasteners || s.tools) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {s.fasteners && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                        {s.fasteners}
                      </span>
                    )}
                    {s.tools?.map((t, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-900"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PrintPreview({
  result,
  config,
  legHeight,
  unit,
}: {
  result: ReturnType<typeof calculate>;
  config: BenchConfig;
  legHeight: number;
  unit: Unit;
}) {
  return (
    <div className="space-y-6 bg-white p-6 text-stone-900">
      <header className="border-b border-stone-300 pb-3">
        <h1 className="text-2xl font-bold">Workbench Build Sheet</h1>
        <p className="text-sm">
          Top {formatLength(config.topLength, unit)} ×{" "}
          {formatLength(config.topWidth, unit)} ×{" "}
          {formatLength(config.totalHeight, unit)} H · Joinery:{" "}
          <span className="font-medium">{config.joinery}</span>
          {config.includeShelf && " · Shelf"}
          {config.doubledTop && " · Doubled top"}
          {config.casters && " · Casters"}
          {config.pegboard && " · Pegboard"}
          {config.toolWell && " · Tool well"}
        </p>
      </header>

      <section className="print-avoid-break">
        <BenchIsoDiagram config={config} legHeight={legHeight} unit={unit} />
      </section>

      <section className="print-avoid-break">
        <h2 className="mb-2 text-lg font-bold">Cut list</h2>
        <CutListTable rows={result.cutList} unit={unit} compact />
      </section>

      {result.lumberBoards.length > 0 && (
        <section className="print-break">
          <h2 className="mb-2 text-lg font-bold">Lumber cut diagrams</h2>
          <div className="space-y-3">
            {result.lumberBoards.map((b, i) => (
              <div className="print-avoid-break" key={i}>
                <LumberDiagram board={b} index={i} unit={unit} />
              </div>
            ))}
          </div>
        </section>
      )}

      {result.sheetLayouts.length > 0 && (
        <section className="print-break">
          <h2 className="mb-2 text-lg font-bold">Sheet cut layouts</h2>
          <div className="space-y-3">
            {result.sheetLayouts.map((l, i) => (
              <div className="print-avoid-break" key={i}>
                <SheetDiagram layout={l} index={i} unit={unit} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="print-break">
        <h2 className="mb-2 text-lg font-bold">Shopping list</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-400 text-left text-xs uppercase">
              <th className="pb-1">Qty</th>
              <th className="pb-1">Item</th>
              <th className="pb-1">Notes</th>
              <th className="pb-1 text-right">~Cost</th>
            </tr>
          </thead>
          <tbody>
            {result.hardware.map((h, i) => (
              <tr key={i} className="border-b border-stone-200">
                <td className="py-1">
                  {h.qty}
                  {h.unit ? ` ${h.unit}` : ""}
                </td>
                <td className="py-1">{h.itemLabel}</td>
                <td className="py-1 text-xs">{h.note ?? ""}</td>
                <td className="py-1 text-right font-mono text-xs">
                  {h.estimatedCost !== undefined
                    ? `$${h.estimatedCost.toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-stone-500 font-bold">
              <td className="py-1"></td>
              <td className="py-1">Total estimated</td>
              <td></td>
              <td className="py-1 text-right font-mono">
                {result.totals.estimatedCost !== undefined
                  ? `$${result.totals.estimatedCost.toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="print-avoid-break">
        <h2 className="mb-2 text-lg font-bold">Tools required</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          {result.tools.map((t, i) => (
            <li key={i}>
              {t.required ? "●" : "○"} {t.name}
              {t.note && <span className="text-stone-500"> — {t.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="print-break">
        <h2 className="mb-2 text-lg font-bold">Build directions</h2>
        <ol className="space-y-2">
          {result.steps.map((s) => (
            <li key={s.n} className="print-avoid-break border-l-2 border-stone-300 pl-3">
              <div className="font-semibold">
                {s.n}. {s.title}
              </div>
              <p className="text-sm">{s.body}</p>
              {s.fasteners && (
                <p className="text-xs italic text-stone-600">
                  Fasteners: {s.fasteners}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {result.warnings.length > 0 && (
        <section className="print-avoid-break border-t border-stone-300 pt-3">
          <h2 className="text-sm font-bold">Notes / warnings</h2>
          <ul className="list-disc pl-5 text-xs">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ====================================================================== */
/*                              Sub-pieces                                */
/* ====================================================================== */

function CutListTable({
  rows,
  unit,
  compact = false,
}: {
  rows: ReturnType<typeof calculate>["cutList"];
  unit: Unit;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No cuts — adjust the inputs to see results.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
        <tr>
          <th className={compact ? "pb-1" : "pb-2"}>Part</th>
          <th className={compact ? "pb-1" : "pb-2"}>Qty</th>
          <th className={compact ? "pb-1" : "pb-2"}>Material</th>
          <th className={compact ? "pb-1" : "pb-2"}>Dimensions</th>
          <th className={compact ? "pb-1" : "pb-2"}>Purpose</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-stone-100 last:border-0">
            <td className={`${compact ? "py-1" : "py-2"} font-mono font-semibold`}>
              {row.partCode}
            </td>
            <td className={`${compact ? "py-1" : "py-2"} font-medium`}>{row.qty}</td>
            <td className={compact ? "py-1" : "py-2"}>{row.materialLabel}</td>
            <td className={`${compact ? "py-1" : "py-2"} font-mono text-xs`}>
              {formatLength(row.length, unit)}
              {row.width !== undefined && ` × ${formatLength(row.width, unit)}`}
              {row.thickness !== undefined && ` × ${formatLength(row.thickness, unit)} thk`}
            </td>
            <td className={`${compact ? "py-1" : "py-2"} text-stone-600`}>
              {row.purpose}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 text-center shadow-sm">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function NumField({
  label,
  hint,
  suffix,
  value,
  onChange,
  step = 0.25,
  disabled = false,
}: {
  label: string;
  hint?: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <span className="block text-xs font-medium text-stone-700">
        {label}{" "}
        {hint && <span className="font-normal text-stone-500">— {hint}</span>}
      </span>
      <div className="mt-1 flex items-center rounded border border-stone-300 bg-white focus-within:border-stone-500">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="w-full bg-transparent px-2 py-1.5 text-sm outline-none disabled:cursor-not-allowed"
        />
        {suffix && <span className="px-2 text-xs text-stone-500">{suffix}</span>}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <span className="block text-xs font-medium text-stone-700">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none disabled:cursor-not-allowed"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-end pb-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300"
      />
      <span>{label}</span>
    </label>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
function roundFine(n: number) {
  return Math.round(n * 10000) / 10000;
}
