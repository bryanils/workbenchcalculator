// Multi-strategy guillotine bin-pack for sheet goods. Each strategy is a
// (sort × placement × split) triple; we run all 72 combos plus a seeded
// permutation perturbation and keep the layout with the fewest sheets, then
// the least waste. Every layout is achievable with straight edge-to-edge saw
// cuts; kerf is subtracted from leftover space on each split.

export type SheetCutInput = {
  w: number;
  h: number;
  partCode: string;
  purpose: string;
};

export type PlacedPiece = {
  x: number;
  y: number;
  w: number;
  h: number;
  partCode: string;
  purpose: string;
  rotated: boolean;
};

export type SheetLayout = {
  sheetW: number;
  sheetH: number;
  pieces: PlacedPiece[];
  usedArea: number;
};

type FreeRect = { x: number; y: number; w: number; h: number };
type SheetState = { sheetW: number; sheetH: number; pieces: PlacedPiece[]; free: FreeRect[] };

type SortKey = "areaDesc" | "longSideDesc" | "shortSideDesc" | "perimeterDesc" | "diffDesc" | "areaAsc";
type Heuristic = "bssf" | "blsf" | "baf";
type SplitRule = "sas" | "las" | "slas" | "llas";

type Strategy = { sort: SortKey; heuristic: Heuristic; split: SplitRule };

type Candidate = {
  sheet: SheetState;
  rectIdx: number;
  rotated: boolean;
  score: number;
};

const SORT_KEYS: SortKey[] = [
  "areaDesc",
  "longSideDesc",
  "shortSideDesc",
  "perimeterDesc",
  "diffDesc",
  "areaAsc",
];
const HEURISTICS: Heuristic[] = ["bssf", "blsf", "baf"];
const SPLITS: SplitRule[] = ["sas", "las", "slas", "llas"];

export function packSheets(
  cutsRaw: SheetCutInput[],
  sheetW: number,
  sheetH: number,
  kerf: number,
): { layouts: SheetLayout[]; oversize: SheetCutInput[] } {
  const SW = Math.max(sheetW, sheetH);
  const SH = Math.min(sheetW, sheetH);

  const oversize: SheetCutInput[] = [];
  const fitting: SheetCutInput[] = [];
  for (const c of cutsRaw) {
    if (Math.max(c.w, c.h) > SW || Math.min(c.w, c.h) > SH) oversize.push(c);
    else fitting.push(c);
  }

  const best = runTournament(fitting, SW, SH, kerf);
  const refined = perturbBestPack(fitting, SW, SH, kerf, best);

  return { layouts: toPublicLayouts(refined.sheets), oversize };
}

type PackResult = {
  sheets: SheetState[];
  strategy: Strategy;
  sheetCount: number;
  wasteArea: number;
};

function runTournament(
  cuts: SheetCutInput[],
  SW: number,
  SH: number,
  kerf: number,
): PackResult {
  const sheetArea = SW * SH;
  let best: PackResult | null = null;
  let bestRank = Infinity;

  for (const sort of SORT_KEYS) {
    for (const heuristic of HEURISTICS) {
      for (const split of SPLITS) {
        const strategy: Strategy = { sort, heuristic, split };
        const sheets = packOnce(cuts, SW, SH, kerf, strategy);
        const score = scoreLayout(sheets, sheetArea);
        const rank = score.sheets * sheetArea * 1000 + score.waste;
        if (rank < bestRank) {
          bestRank = rank;
          best = { sheets, strategy, sheetCount: score.sheets, wasteArea: score.waste };
        }
      }
    }
  }

  if (!best) {
    return { sheets: [], strategy: { sort: "areaDesc", heuristic: "bssf", split: "sas" }, sheetCount: 0, wasteArea: 0 };
  }
  return best;
}

function perturbBestPack(
  cuts: SheetCutInput[],
  SW: number,
  SH: number,
  kerf: number,
  base: PackResult,
): PackResult {
  if (cuts.length < 8) return base;
  const sheetArea = SW * SH;
  if (base.sheetCount === 1 && base.wasteArea / sheetArea < 0.05) return base;

  const restarts = 50;
  const seed = seedFromCuts(cuts);
  const rand = createLcg(seed);

  let best = base;
  let bestRank = base.sheetCount * sheetArea * 1000 + base.wasteArea;

  const baseSorted = sortCuts(cuts, base.strategy.sort);
  for (let r = 0; r < restarts; r++) {
    const perturbed = swapNeighbors(baseSorted, rand, 3);
    const sheets = packOrdered(perturbed, SW, SH, kerf, base.strategy.heuristic, base.strategy.split);
    const score = scoreLayout(sheets, sheetArea);
    const rank = score.sheets * sheetArea * 1000 + score.waste;
    if (rank < bestRank) {
      bestRank = rank;
      best = { sheets, strategy: base.strategy, sheetCount: score.sheets, wasteArea: score.waste };
    }
  }
  return best;
}

function packOnce(
  cuts: SheetCutInput[],
  SW: number,
  SH: number,
  kerf: number,
  strategy: Strategy,
): SheetState[] {
  const ordered = sortCuts(cuts, strategy.sort);
  return packOrdered(ordered, SW, SH, kerf, strategy.heuristic, strategy.split);
}

function packOrdered(
  ordered: SheetCutInput[],
  SW: number,
  SH: number,
  kerf: number,
  heuristic: Heuristic,
  split: SplitRule,
): SheetState[] {
  const sheets: SheetState[] = [];
  for (const cut of ordered) {
    const best = findBestFit(cut, sheets, heuristic);
    if (best) {
      commitPlacement(best, cut, kerf, split);
      continue;
    }
    const fresh: SheetState = {
      sheetW: SW,
      sheetH: SH,
      pieces: [],
      free: [{ x: 0, y: 0, w: SW, h: SH }],
    };
    sheets.push(fresh);
    const placed = findBestFit(cut, [fresh], heuristic);
    if (placed) commitPlacement(placed, cut, kerf, split);
  }
  return sheets;
}

function sortCuts(cuts: SheetCutInput[], key: SortKey): SheetCutInput[] {
  const arr = [...cuts];
  switch (key) {
    case "areaDesc":
      arr.sort((a, b) => b.w * b.h - a.w * a.h || Math.max(b.w, b.h) - Math.max(a.w, a.h));
      break;
    case "longSideDesc":
      arr.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h);
      break;
    case "shortSideDesc":
      arr.sort((a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || b.w * b.h - a.w * a.h);
      break;
    case "perimeterDesc":
      arr.sort((a, b) => b.w + b.h - (a.w + a.h));
      break;
    case "diffDesc":
      arr.sort((a, b) => Math.abs(b.w - b.h) - Math.abs(a.w - a.h) || b.w * b.h - a.w * a.h);
      break;
    case "areaAsc":
      arr.sort((a, b) => a.w * a.h - b.w * b.h);
      break;
  }
  return arr;
}

function findBestFit(
  cut: SheetCutInput,
  sheets: SheetState[],
  heuristic: Heuristic,
): Candidate | null {
  let best: Candidate | null = null;
  for (const sheet of sheets) {
    for (let i = 0; i < sheet.free.length; i++) {
      const f = sheet.free[i];
      if (!f) continue;
      if (cut.w <= f.w && cut.h <= f.h) {
        const score = scorePlacement(f, cut.w, cut.h, heuristic);
        if (!best || score < best.score) {
          best = { sheet, rectIdx: i, rotated: false, score };
        }
      }
      if (cut.h <= f.w && cut.w <= f.h) {
        const score = scorePlacement(f, cut.h, cut.w, heuristic);
        if (!best || score < best.score) {
          best = { sheet, rectIdx: i, rotated: true, score };
        }
      }
    }
  }
  return best;
}

function scorePlacement(f: FreeRect, w: number, h: number, heuristic: Heuristic): number {
  const leftoverW = f.w - w;
  const leftoverH = f.h - h;
  switch (heuristic) {
    case "bssf":
      return Math.min(leftoverW, leftoverH);
    case "blsf":
      return Math.max(leftoverW, leftoverH);
    case "baf":
      return f.w * f.h - w * h;
  }
}

function commitPlacement(c: Candidate, cut: SheetCutInput, kerf: number, split: SplitRule) {
  const f = c.sheet.free[c.rectIdx];
  if (!f) return;
  const pw = c.rotated ? cut.h : cut.w;
  const ph = c.rotated ? cut.w : cut.h;

  c.sheet.pieces.push({
    x: f.x,
    y: f.y,
    w: pw,
    h: ph,
    partCode: cut.partCode,
    purpose: cut.purpose,
    rotated: c.rotated,
  });

  c.sheet.free.splice(c.rectIdx, 1);

  const [right, top] = splitFreeRect(f, pw, ph, kerf, split);
  if (right) c.sheet.free.push(right);
  if (top) c.sheet.free.push(top);

  mergeFreeRects(c.sheet.free);
}

function splitFreeRect(
  f: FreeRect,
  pw: number,
  ph: number,
  kerf: number,
  rule: SplitRule,
): [FreeRect | null, FreeRect | null] {
  const leftoverW = f.w - pw;
  const leftoverH = f.h - ph;

  // pickFullWidthTop=true => horizontal cut: top spans parent's full width,
  // right-of-piece is short (height = piece height).
  // pickFullWidthTop=false => vertical cut: right-of-piece spans parent's
  // full height, top spans only piece width.
  // Per Jylanki "A Thousand Ways to Pack the Bin":
  //   SAS / LAS compare the FREE rect's own dimensions (f.w vs f.h).
  //   SLAS / LLAS compare leftover area projected through the placed piece.
  let fullWidthTop: boolean;
  switch (rule) {
    case "sas":
      fullWidthTop = f.w <= f.h;
      break;
    case "las":
      fullWidthTop = f.w >= f.h;
      break;
    case "slas":
      fullWidthTop = leftoverW * ph < leftoverH * pw;
      break;
    case "llas":
      fullWidthTop = leftoverW * ph >= leftoverH * pw;
      break;
  }

  if (fullWidthTop) {
    const right =
      leftoverW > kerf
        ? { x: f.x + pw + kerf, y: f.y, w: leftoverW - kerf, h: ph }
        : null;
    const top =
      leftoverH > kerf
        ? { x: f.x, y: f.y + ph + kerf, w: f.w, h: leftoverH - kerf }
        : null;
    return [right, top];
  }
  const right =
    leftoverW > kerf
      ? { x: f.x + pw + kerf, y: f.y, w: leftoverW - kerf, h: f.h }
      : null;
  const top =
    leftoverH > kerf
      ? { x: f.x, y: f.y + ph + kerf, w: pw, h: leftoverH - kerf }
      : null;
  return [right, top];
}

function mergeFreeRects(rects: FreeRect[]) {
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < rects.length; i++) {
      const a = rects[i];
      if (!a) continue;
      for (let j = i + 1; j < rects.length; j++) {
        const b = rects[j];
        if (!b) continue;
        const merged = mergePair(a, b);
        if (merged) {
          rects[i] = merged;
          rects.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
}

function mergePair(a: FreeRect, b: FreeRect): FreeRect | null {
  if (a.x === b.x && a.w === b.w) {
    if (a.y + a.h === b.y) return { x: a.x, y: a.y, w: a.w, h: a.h + b.h };
    if (b.y + b.h === a.y) return { x: a.x, y: b.y, w: a.w, h: a.h + b.h };
  }
  if (a.y === b.y && a.h === b.h) {
    if (a.x + a.w === b.x) return { x: a.x, y: a.y, w: a.w + b.w, h: a.h };
    if (b.x + b.w === a.x) return { x: b.x, y: a.y, w: a.w + b.w, h: a.h };
  }
  return null;
}

function scoreLayout(sheets: SheetState[], sheetArea: number): { sheets: number; waste: number } {
  let used = 0;
  for (const s of sheets) for (const p of s.pieces) used += p.w * p.h;
  return { sheets: sheets.length, waste: sheets.length * sheetArea - used };
}

function toPublicLayouts(sheets: SheetState[]): SheetLayout[] {
  return sheets.map((s) => ({
    sheetW: s.sheetW,
    sheetH: s.sheetH,
    pieces: s.pieces,
    usedArea: s.pieces.reduce((sum, p) => sum + p.w * p.h, 0),
  }));
}

function swapNeighbors(cuts: SheetCutInput[], rand: () => number, swaps: number): SheetCutInput[] {
  const arr = [...cuts];
  for (let s = 0; s < swaps; s++) {
    const i = Math.floor(rand() * arr.length);
    const window = Math.max(2, Math.floor(arr.length / 6));
    const offset = Math.floor(rand() * window) - Math.floor(window / 2);
    const j = Math.max(0, Math.min(arr.length - 1, i + offset));
    if (i === j) continue;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function seedFromCuts(cuts: SheetCutInput[]): number {
  let h = 0x811c9dc5;
  for (const c of cuts) {
    h = Math.imul(h ^ Math.floor(c.w * 1000), 0x01000193) >>> 0;
    h = Math.imul(h ^ Math.floor(c.h * 1000), 0x01000193) >>> 0;
  }
  return h >>> 0 || 1;
}

function createLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
