// Real-engineering-ish stability assessment. We compute three independent
// signals — top sag, racking resistance, tipping ratio — then roll them up
// to a verdict the user can act on.
//
// Numbers are *order-of-magnitude* good. They are not a substitute for a
// structural engineer, but they will reliably flag "this 72" 2x4 bench with
// no floor stretchers will rack" and "your 3/4" plywood top will sag
// noticeably between aprons 60" apart".

import { getLumber, getSheet } from "./materials";
import { deriveGeometry } from "./derive";
import type {
  BenchConfig,
  StabilityReport,
  StabilityVerdict,
} from "./types";

// Approximate elastic moduli (psi). These are conservative softwood / sheet
// values; hardwood Roubo tops are stiffer but we don't bother distinguishing.
const E_PLYWOOD = 1_300_000;
const E_LUMBER_SYP = 1_600_000; // southern yellow pine, dressed
const DENSITY_LUMBER_LB_IN3 = 0.0173;
const DENSITY_SHEET_LB_IN3 = 0.025;
const DENSITY_SLAB_LB_IN3 = 0.030; // dense softwood / mid hardwood

// Tunable load: 200 lb point load at mid-span. Real "lean on the bench"
// load is ~80-150 lb but the safety factor on a workbench top should
// comfortably absorb a man's full weight at center.
const TEST_POINT_LOAD_LBF = 200;
// Approximate lateral load at the top edge of a bench when someone pushes
// it sideways or planes hard along the long axis.
const TEST_LATERAL_LOAD_LBF = 60;

// Joint racking strength (lateral resistance per joint, lbf, before yielding):
const JOINT_STRENGTH: Record<string, number> = {
  pocket: 180, // pocket-screw single 2-1/2"
  lag: 750, // 3/8" lag through leg into apron end
  mortise: 1100, // glued M&T, drawbored or wedged
};

export function assessStability(c: BenchConfig): StabilityReport {
  const g = deriveGeometry(c);

  // ----- Top sag -----
  // Unsupported span is the longer apron length. A center stretcher cuts it
  // in half. With laminated/slab tops, the top itself is the beam.
  const apronSpan = g.insideLongTop;
  const supportedSpan = c.stretchers.centerStretcher ? apronSpan / 2 : apronSpan;
  const topSagInches = computeTopSag(c, supportedSpan, g.topThickness, c.topDepth);
  // Industry rule of thumb: deflection limit L/360 for floors, L/240 for
  // shelves. A workbench top expected to take pounding should be at or
  // below L/240.
  const topSagLimit = supportedSpan / 240;

  // ----- Racking resistance -----
  const rack = computeRackingResistance(c, g);

  // ----- Tipping ratio -----
  // Use the SHORTER footprint dimension (most tippy direction) over the
  // height. >0.6 is rock-solid, 0.45–0.6 acceptable, <0.45 tippy.
  const minFootprint = Math.min(g.floorSpanShort, g.floorSpanLong);
  const tipRatio = minFootprint / c.totalHeight;

  // ----- Base weight (heavier base = better hand-tool work) -----
  const baseWeightLb = estimateBaseWeight(c, g);

  // ----- Roll up to a verdict -----
  const notes: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (topSagInches > topSagLimit) {
    const over = ((topSagInches / topSagLimit - 1) * 100).toFixed(0);
    warnings.push(
      `Top deflects ~${topSagInches.toFixed(2)}" under a 200 lb center load — ${over}% past the L/240 limit (${topSagLimit.toFixed(2)}"). Add a center stretcher or thicker top.`,
    );
    score -= Math.min(35, 35 * (topSagInches / topSagLimit - 1));
  } else if (topSagInches > topSagLimit * 0.5) {
    notes.push(
      `Top sag is acceptable (~${topSagInches.toFixed(2)}" at 200 lb, limit ${topSagLimit.toFixed(2)}").`,
    );
  } else {
    notes.push(
      `Top is very stiff (~${topSagInches.toFixed(2)}" sag at 200 lb point load).`,
    );
  }

  if (rack < TEST_LATERAL_LOAD_LBF) {
    warnings.push(
      `Base resists only ~${rack.toFixed(0)} lbf of side push before noticeable rack. Add floor stretchers or upgrade joinery.`,
    );
    score -= 35;
  } else if (rack < TEST_LATERAL_LOAD_LBF * 3) {
    notes.push(
      `Racking resistance ~${rack.toFixed(0)} lbf — fine for casual use.`,
    );
    score -= 10;
  } else {
    notes.push(`Racking resistance ~${rack.toFixed(0)} lbf — very stiff base.`);
  }

  if (tipRatio < 0.45) {
    warnings.push(
      `Footprint-to-height ratio ${tipRatio.toFixed(2)} — bench can tip when leaned on. Widen the depth or add splayed legs.`,
    );
    score -= 20;
  } else if (tipRatio < 0.6) {
    notes.push(`Footprint-to-height ratio ${tipRatio.toFixed(2)} — adequate.`);
  } else {
    notes.push(
      `Footprint-to-height ratio ${tipRatio.toFixed(2)} — very stable stance.`,
    );
  }

  if (baseWeightLb < 60 && !c.casters) {
    notes.push(
      `Bench weighs ~${baseWeightLb.toFixed(0)} lb — light. Hand-tool work may scoot it; bolt to floor or add weight to lower shelf.`,
    );
    score -= 5;
  } else {
    notes.push(`Estimated assembled weight: ~${baseWeightLb.toFixed(0)} lb.`);
  }

  if (c.casters && !c.stretchers.floorStretchers) {
    warnings.push(
      "Mobile bench without floor stretchers will splay outward as it rolls. Add floor stretchers.",
    );
    score -= 15;
  }

  if (c.legSplayDeg > 0 && c.joinery !== "mortise") {
    warnings.push(
      "Splayed legs need wedged through-tenons to lock the angle. Pocket/lag joinery will loosen over time.",
    );
    score -= 10;
  }

  if (c.knockdown && c.joinery === "pocket") {
    warnings.push(
      "Knockdown bench with pocket-screw joinery isn't really knockdown — pocket screws strip after a few re-installs. Use lag/threaded-rod joinery for a true knockdown bench.",
    );
    score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = scoreToVerdict(score, warnings.length);

  return {
    verdict,
    score,
    topSagInches,
    topSagLimitInches: topSagLimit,
    rackingResistanceLbf: rack,
    tipRatio,
    baseWeightLb,
    notes,
    warnings,
  };
}

function scoreToVerdict(score: number, warningCount: number): StabilityVerdict {
  if (warningCount >= 2 || score < 50) return "unstable";
  if (warningCount >= 1 || score < 70) return "marginal";
  if (score < 88) return "acceptable";
  return "solid";
}

// ----------------------------------------------------------------------
// Top sag: model the top as a simply-supported beam loaded at center.
//   δ = P L³ / (48 E I)
// Width of the "beam" = full top depth (in), height = top thickness.
// ----------------------------------------------------------------------

function computeTopSag(
  c: BenchConfig,
  spanIn: number,
  thicknessIn: number,
  widthIn: number,
): number {
  let E: number;
  switch (c.topConstruction) {
    case "single-sheet":
    case "doubled-sheet":
      E = E_PLYWOOD;
      break;
    case "laminated-2x":
    case "slab":
      E = E_LUMBER_SYP;
      break;
  }
  const I = (widthIn * Math.pow(thicknessIn, 3)) / 12;
  return (TEST_POINT_LOAD_LBF * Math.pow(spanIn, 3)) / (48 * E * I);
}

// ----------------------------------------------------------------------
// Racking resistance: rough model that combines joint strength,
// stretcher placement, and apron depth into a single "lateral lbf to
// noticeably rack" number.
// ----------------------------------------------------------------------

function computeRackingResistance(
  c: BenchConfig,
  _g: ReturnType<typeof deriveGeometry>,
): number {
  const j = JOINT_STRENGTH[c.joinery] ?? 200;

  // Top aprons contribute the joint resistance × 4 corners × leverage:
  const apronSpec = getLumber(c.apronMaterialId);
  const apronDepth = apronSpec?.actualDepth ?? 3.5;
  // Deeper aprons give more rotational stiffness at the leg joint:
  const apronFactor = Math.min(2.5, apronDepth / 3.5);
  let total = 4 * j * apronFactor;

  // Floor stretchers add the largest single contribution because they cut
  // the racking moment in half — the base becomes a parallelogram with TWO
  // rails resisting, not one. Multiplier ~ 2.5×.
  if (c.stretchers.floorStretchers) {
    total *= 2.5;
  }

  // Center stretcher under top adds modest stiffness:
  if (c.stretchers.centerStretcher) {
    total += 4 * j * 0.2;
  }

  // Sheet shelf is a stressed-skin diaphragm — meaningful when present:
  if (c.stretchers.lowerShelf) {
    total *= 1.15;
  }

  // Diagonal corner braces: only if no floor stretchers (otherwise redundant)
  if (c.stretchers.diagonalBraces && !c.stretchers.floorStretchers) {
    total *= 1.8;
  }

  // Splayed legs increase end-grain racking resistance:
  if (c.legSplayDeg >= 10) {
    total *= 1.3;
  }

  // Casters cut effective racking resistance — wheel deflection adds slop:
  if (c.casters) {
    total *= 0.85;
  }

  // Heavier legs (4x4 vs 2x4) handle racking moment better through pure section modulus:
  const legSpec = getLumber(c.legMaterialId);
  const legCrossArea =
    (legSpec?.actualWidth ?? 1.5) * (legSpec?.actualDepth ?? 3.5);
  total *= Math.min(2.0, legCrossArea / 5.25); // 2x4 cross-section = 5.25 sq in baseline

  return total;
}

// ----------------------------------------------------------------------
// Estimated weight of the assembled bench.
// ----------------------------------------------------------------------

function estimateBaseWeight(
  c: BenchConfig,
  g: ReturnType<typeof deriveGeometry>,
): number {
  let w = 0;

  // Legs (4 of them):
  const leg = getLumber(c.legMaterialId);
  if (leg) {
    w +=
      4 *
      leg.actualWidth *
      leg.actualDepth *
      g.legCutLength *
      DENSITY_LUMBER_LB_IN3;
  }

  // Aprons (top): 2 long + 2 short
  const apron = getLumber(c.apronMaterialId);
  if (apron) {
    const apronVol =
      apron.actualWidth * apron.actualDepth *
      (2 * g.insideLongTop + 2 * g.insideShortTop);
    w += apronVol * DENSITY_LUMBER_LB_IN3;
  }

  // Floor stretchers (2 long + 2 short):
  if (c.stretchers.floorStretchers) {
    const s = getLumber(c.stretcherMaterialId);
    if (s) {
      const vol =
        s.actualWidth * s.actualDepth *
        (2 * g.insideLongFloor + 2 * g.insideShortFloor);
      w += vol * DENSITY_LUMBER_LB_IN3;
    }
  }

  // Center stretcher:
  if (c.stretchers.centerStretcher) {
    const s = getLumber(c.stretcherMaterialId);
    if (s) {
      w += s.actualWidth * s.actualDepth * g.insideShortTop * DENSITY_LUMBER_LB_IN3;
    }
  }

  // Top
  switch (c.topConstruction) {
    case "single-sheet":
    case "doubled-sheet": {
      const sheet = getSheet(c.topMaterialId);
      if (sheet) {
        const t = sheet.thickness * (c.topConstruction === "doubled-sheet" ? 2 : 1);
        w += c.topLength * c.topDepth * t * DENSITY_SHEET_LB_IN3;
      }
      break;
    }
    case "laminated-2x":
    case "slab":
      w += c.topLength * c.topDepth * g.topThickness * DENSITY_SLAB_LB_IN3;
      break;
  }

  return w;
}
