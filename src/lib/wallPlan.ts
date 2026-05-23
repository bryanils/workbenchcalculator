// Wall planner: given a wall length and bench depth, return ranked options
// for filling that wall with one or more modular benches. Considers equal
// splits AND max-out-plus-remainder plans (e.g. "2x 8 ft + 1x 66 in"). Uses
// the same packSheets() bin-packer as the calculator to score top-piece
// yield from real 4x8 sheets, so a candidate's sheet count here matches
// what the per-bench BOM would produce downstream.

import { packSheets } from "./packSheet";
import { SHEETS } from "./materials";

export type WallPlanInputs = {
  wallLengthIn: number;
  benchDepthIn: number;
  // 1 = single-sheet top, 2 = doubled-sheet, 0 = laminated lumber / slab
  // (no sheet for the top; sheet yield not scored).
  topSheetLayers: 0 | 1 | 2;
  minBenchLengthIn?: number;   // default 48
  maxBenchLengthIn?: number;   // default 96 (also long edge of a 4x8 sheet)
  kerfIn?: number;             // default 0.125
};

export type BenchGroup = { lengthIn: number; count: number };

export type WallPlanOption = {
  benches: BenchGroup[];        // grouped, longest first
  label: string;                // e.g. "2 × 96\" + 1 × 18\""
  totalBenchCount: number;
  distinctLengths: number;
  sheetsForTops: number;
  sheetYieldPct: number;        // 0..1, computed via packSheets()
  score: number;
  notes: string[];
};

// Lengths we'll try as the "primary" bench size in max-out plans.
// Half-foot increments from 4 ft to 8 ft; ordered longest-first so larger
// benches surface first when scores tie.
const PRIMARY_LENGTHS = [96, 90, 84, 78, 72, 66, 60, 54, 48];

// Cap total benches we'll even consider; beyond ~6 it's clearly silly.
const MAX_BENCHES = 6;

export function planWall(inputs: WallPlanInputs): WallPlanOption[] {
  const wall = inputs.wallLengthIn;
  const depth = inputs.benchDepthIn;
  const layers = inputs.topSheetLayers;
  const minLen = inputs.minBenchLengthIn ?? 48;
  const maxLen = inputs.maxBenchLengthIn ?? 96;
  const kerf = inputs.kerfIn ?? 0.125;
  const sheet = SHEETS.find((s) => s.id === "ply_3_4") ?? SHEETS[0]!;
  // Real sheets ship slightly over nominal (~0.5" extra per side), so two
  // 24" rips with a 1/8" kerf still fit in a "48\"" sheet. Use the oversize
  // dimensions for packing so the planner doesn't falsely double sheets.
  const SHEET_OVERSIZE = 0.5;
  const packW = sheet.width + SHEET_OVERSIZE;
  const packH = sheet.height + SHEET_OVERSIZE;

  if (wall <= 0 || depth <= 0 || minLen <= 0 || maxLen < minLen) return [];
  if (depth > Math.max(packW, packH)) return [];

  const usable = wall;
  const seen = new Set<string>();
  const candidates: number[][] = [];

  // 1) Equal-split plans
  for (let n = 1; n <= MAX_BENCHES; n++) {
    const L = usable / n;
    if (L < minLen - 1e-6 || L > maxLen + 1e-6) continue;
    addCandidate(seen, candidates, new Array<number>(n).fill(L));
  }

  // 2) Max-out + remainder plans, for each "primary" length P
  for (const P of PRIMARY_LENGTHS) {
    if (P > maxLen + 1e-6 || P < minLen - 1e-6) continue;
    const kMax = Math.min(MAX_BENCHES, Math.floor(usable / P));
    for (let k = 1; k <= kMax; k++) {
      const rem = usable - k * P;
      if (Math.abs(rem) < 1e-6) {
        addCandidate(seen, candidates, new Array<number>(k).fill(P));
      } else if (rem >= minLen - 1e-6 && rem <= maxLen + 1e-6 && k + 1 <= MAX_BENCHES) {
        const plan = new Array<number>(k).fill(P);
        plan.push(rem);
        addCandidate(seen, candidates, plan);
      }
    }
  }

  const nominalArea = sheet.width * sheet.height;
  const options: WallPlanOption[] = [];
  for (const lengths of candidates) {
    const opt = scoreCandidate(lengths, depth, packW, packH, nominalArea, kerf, maxLen, layers);
    if (opt) options.push(opt);
  }

  // Composite already encodes preferences; sort high-to-low.
  options.sort((a, b) => b.score - a.score);
  return options.slice(0, 8);
}

function scoreCandidate(
  lengths: number[],
  depth: number,
  packW: number,         // oversize dims used for feasibility/packing
  packH: number,
  nominalSheetArea: number, // nominal 48×96 = what you pay for; used for yield %
  kerf: number,
  maxLen: number,
  topLayers: 0 | 1 | 2,
): WallPlanOption | null {
  if (lengths.length === 0) return null;

  let sheetsNeeded = 0;
  let yieldPct = 0;
  if (topLayers > 0) {
    const cuts = lengths.map((l, i) => ({
      w: depth,
      h: l,
      partCode: `T${i + 1}`,
      purpose: "Top",
    }));
    const { layouts, oversize } = packSheets(cuts, packW, packH, kerf);
    if (oversize.length > 0) return null;
    const oneLayerSheets = layouts.length;
    const used = layouts.reduce((s, lay) => s + lay.usedArea, 0);
    sheetsNeeded = oneLayerSheets * topLayers;
    yieldPct = oneLayerSheets > 0
      ? Math.min(1, used / (oneLayerSheets * nominalSheetArea))
      : 0;
  }

  const groups = groupLengths(lengths);
  const benches = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lengthIn, count]) => ({ lengthIn, count }));

  const totalBenchCount = lengths.length;
  const distinctLengths = benches.length;

  // ---- Score components (all in [0,1]) -----------------------------------
  // Sheet yield only matters when tops actually come from sheets. For
  // laminated lumber tops (topLayers===0), drop it from the score so the
  // ranking is driven by simplicity + size only.
  const sheetScore = topLayers > 0 ? yieldPct : 0;
  const sheetWeight = topLayers > 0 ? 0.30 : 0;

  // Fewer benches = simpler build. 1->1.0, 2->0.85, 3->0.72, 4->0.61, ...
  const fewBenchesScore = Math.pow(0.85, totalBenchCount - 1);

  // Uniform = interchangeable. 1 size = 1.0, 2 sizes = 0.6.
  const modularScore = distinctLengths === 1 ? 1 : 0.6;

  // Whole-inch and half-inch lengths build easier than oddball fractions.
  const roundnessScore = avgRoundness(lengths);

  // Bias toward big benches (closer to user's max). Discourages many shorts.
  const maxObserved = Math.max(...lengths);
  const sizeBias = Math.min(1, maxObserved / maxLen);

  // Re-normalize remaining weights so total = 1 when sheets don't apply.
  const remaining = 1 - sheetWeight;
  const weightSum = 0.25 + 0.20 + 0.15 + 0.10;
  const norm = remaining / weightSum;

  const score =
    sheetScore * sheetWeight +
    fewBenchesScore * 0.25 * norm +
    sizeBias * 0.20 * norm +
    modularScore * 0.15 * norm +
    roundnessScore * 0.10 * norm;

  const label = benches.map((b) => `${b.count} × ${formatLen(b.lengthIn)}`).join("  +  ");

  const notes: string[] = [];
  if (topLayers > 0) {
    const layerNote = topLayers === 2 ? " (doubled top)" : "";
    notes.push(`${sheetsNeeded} sheet${sheetsNeeded === 1 ? "" : "s"} of 4x8 for tops${layerNote}`);
    if (yieldPct >= 0.95) notes.push(`Excellent sheet yield (${pct(yieldPct)})`);
    else if (yieldPct >= 0.85) notes.push(`Good sheet yield (${pct(yieldPct)})`);
    else notes.push(`Sheet yield ${pct(yieldPct)}`);
  } else {
    notes.push("Top is laminated lumber (not sheet stock)");
  }
  if (distinctLengths === 1) notes.push("All benches identical (modular)");
  if (lengths.every((l) => Math.abs(l - Math.round(l)) < 1e-6)) notes.push("Whole-inch lengths");
  if (maxObserved >= 84) notes.push("Long benches — fewer seams across the wall");

  return {
    benches,
    label,
    totalBenchCount,
    distinctLengths,
    sheetsForTops: sheetsNeeded,
    sheetYieldPct: yieldPct,
    score,
    notes,
  };
}

function addCandidate(seen: Set<string>, out: number[][], lengths: number[]) {
  const key = [...lengths]
    .sort((a, b) => a - b)
    .map((l) => l.toFixed(3))
    .join(",");
  if (seen.has(key)) return;
  seen.add(key);
  out.push(lengths);
}

function groupLengths(lengths: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const l of lengths) {
    // Bucket to 1/16" so 70.0001 and 70.0 collapse together.
    const key = Math.round(l * 16) / 16;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

function avgRoundness(lengths: number[]): number {
  let s = 0;
  for (const l of lengths) {
    const halfFrac = Math.abs(l * 2 - Math.round(l * 2)) / 2;
    s += 1 - Math.min(halfFrac * 4, 1);
  }
  return s / lengths.length;
}

function formatLen(l: number): string {
  if (Math.abs(l - Math.round(l)) < 1e-6) return `${Math.round(l)}"`;
  return `${l.toFixed(2).replace(/\.?0+$/, "")}"`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}
