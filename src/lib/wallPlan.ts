// Wall planner: given a wall length and bench depth, return ranked options
// for filling that wall with one or more modular benches. Considers equal
// splits AND max-out-plus-remainder plans (e.g. "2x 8 ft + 1x 66 in").
// Candidate dimensions are scored through the real builder calculator so
// material utilization comes from the same cut/packing path as the BOM.

import { calculateFromInputs } from "./calculator";
import type { BenchStyleId } from "./styles";

export type WallPlanInputs = {
  wallLengthIn: number;
  benchDepthIn: number;
  benchHeightIn: number;
  styleId: BenchStyleId;
  minBenchLengthIn?: number;   // default 48
  maxBenchLengthIn?: number;   // default 96
};

export type BenchGroup = { lengthIn: number; count: number };

export type WallPlanOption = {
  benches: BenchGroup[];        // grouped, longest first
  label: string;                // e.g. "2 × 96\" + 1 × 18\""
  totalBenchCount: number;
  distinctLengths: number;
  materialYieldPct: number;
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
  const minLen = inputs.minBenchLengthIn ?? 48;
  const maxLen = inputs.maxBenchLengthIn ?? 96;

  if (wall <= 0 || depth <= 0 || minLen <= 0 || maxLen < minLen) return [];

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

  const options: WallPlanOption[] = [];
  for (const lengths of candidates) {
    const opt = scoreCandidate(lengths, maxLen, inputs);
    if (opt) options.push(opt);
  }

  // Composite already encodes preferences; sort high-to-low.
  options.sort((a, b) => b.score - a.score);
  return options.slice(0, 8);
}

function scoreCandidate(
  lengths: number[],
  maxLen: number,
  inputs: WallPlanInputs,
): WallPlanOption | null {
  if (lengths.length === 0) return null;

  const groups = groupLengths(lengths);
  const benches = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lengthIn, count]) => ({ lengthIn, count }));
  const materialFit = scoreMaterialFit(benches, inputs);

  const totalBenchCount = lengths.length;
  const distinctLengths = benches.length;

  // ---- Score components (all in [0,1]) -----------------------------------
  // Fewer benches = simpler build. 1->1.0, 2->0.85, 3->0.72, 4->0.61, ...
  const fewBenchesScore = Math.pow(0.85, totalBenchCount - 1);

  // Uniform = interchangeable. 1 size = 1.0, 2 sizes = 0.6.
  const modularScore = distinctLengths === 1 ? 1 : 0.6;

  // Whole-inch and half-inch lengths build easier than oddball fractions.
  const roundnessScore = avgRoundness(lengths);

  // Bias toward big benches (closer to user's max). Discourages many shorts.
  const maxObserved = Math.max(...lengths);
  const sizeBias = Math.min(1, maxObserved / maxLen);

  const score =
    materialFit.yieldPct * 0.40 +
    fewBenchesScore * 0.20 +
    sizeBias * 0.15 +
    modularScore * 0.15 +
    roundnessScore * 0.10;

  const label = benches.map((b) => `${b.count} × ${formatLen(b.lengthIn)}`).join("  +  ");

  const notes: string[] = [];
  notes.push(`Estimated material yield ${formatPct(materialFit.yieldPct)}`);
  if (materialFit.warningCount > 0) notes.push(`${materialFit.warningCount} build warning${materialFit.warningCount === 1 ? "" : "s"}`);
  if (distinctLengths === 1) notes.push("All benches identical (modular)");
  if (lengths.every((l) => Math.abs(l - Math.round(l)) < 1e-6)) notes.push("Whole-inch lengths");
  if (maxObserved >= 84) notes.push("Long benches — fewer seams across the wall");

  return {
    benches,
    label,
    totalBenchCount,
    distinctLengths,
    materialYieldPct: materialFit.yieldPct,
    score,
    notes,
  };
}

function scoreMaterialFit(
  benches: BenchGroup[],
  inputs: WallPlanInputs,
): { yieldPct: number; warningCount: number } {
  // Uses the real builder calculator for each distinct bench size. Identical
  // benches are pooled via benchCount; mixed-size plans are aggregated after
  // calculation until the builder supports heterogeneous batch packing.
  let lumberStock = 0;
  let lumberWaste = 0;
  let sheetStock = 0;
  let sheetUsed = 0;
  let warningCount = 0;

  for (const b of benches) {
    const result = calculateFromInputs({
      styleId: inputs.styleId,
      topLength: b.lengthIn,
      topDepth: inputs.benchDepthIn,
      totalHeight: inputs.benchHeightIn,
      benchCount: b.count,
    });
    warningCount += result.warnings.length;

    for (const board of result.lumberBoards) {
      lumberStock += board.stockLen;
      lumberWaste += board.wasteLen;
    }
    for (const layout of result.sheetLayouts) {
      sheetStock += layout.nominalSheetW * layout.nominalSheetH;
      sheetUsed += layout.usedArea;
    }
  }

  const lumberYield = lumberStock > 0
    ? clamp01((lumberStock - lumberWaste) / lumberStock)
    : 1;
  const sheetYield = sheetStock > 0
    ? clamp01(sheetUsed / sheetStock)
    : 1;

  const hasLumber = lumberStock > 0;
  const hasSheet = sheetStock > 0;
  const yieldPct = hasLumber && hasSheet
    ? lumberYield * 0.6 + sheetYield * 0.4
    : hasLumber
      ? lumberYield
      : sheetYield;

  return { yieldPct: clamp01(yieldPct), warningCount };
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

function formatPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

