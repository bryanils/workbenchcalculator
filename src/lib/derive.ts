// Derive the full structural BenchConfig from the simplified user inputs
// (style + L/D/H + a few optional toggles). Everything that affects
// stability — leg cross-section, apron height, stretcher placement, top
// construction, joinery, splay — comes from the style profile so the user
// can never end up with a flimsy bench by accident.

import { getStyle, type StyleProfile, type TopLamOrientation } from "./styles";
import type { BenchConfig, SimpleInputs } from "./types";
import { getLumber, getSheet } from "./materials";

const FALLBACK_STYLE_ID = "heavy-garage" as const;

export function deriveBenchConfig(input: SimpleInputs): BenchConfig {
  const style: StyleProfile = getStyle(input.styleId) ?? getStyle(FALLBACK_STYLE_ID)!;

  const topLength = clamp(input.topLength, style.lengthRange);
  const topDepth = clamp(input.topDepth, style.depthRange);
  const totalHeight = clamp(input.totalHeight, style.heightRange);

  const casters = input.casters ?? style.casters;
  const pegboard = input.pegboard ?? false;
  const pegboardHeight = input.pegboardHeight ?? 24;

  // Auto-promote legs to 4x4 on any bench taller than 32" with mid stretchers
  // only (no floor box) — prevents the user from accidentally building a
  // racky tall 2x4 frame. Style profiles already encode this for the common
  // case; this guard fires only on overrides.
  const needsHeavyLegs =
    totalHeight >= 34 &&
    topLength >= 60 &&
    !style.stretchers.floorStretchers &&
    style.legMaterialId === "2x4";
  const legMaterialId = needsHeavyLegs ? "4x4" : style.legMaterialId;

  // Lamination orientation falls back to a sensible default per construction.
  const topLamOrientation: TopLamOrientation =
    style.topLamOrientation ??
    (style.topConstruction === "laminated-2x" ? "flat-edge" : "flat-edge");

  // Auto-derive lamination count for on-edge tops: N narrow edges of the
  // chosen lumber fill the topDepth.
  const topLamCount =
    style.topConstruction === "laminated-2x"
      ? computeAutoLamCount(style.topMaterialId, topLamOrientation, topDepth, style.topLamCount)
      : (style.topLamCount ?? 0);

  return {
    styleId: style.id,
    topLength,
    topDepth,
    totalHeight,
    overhangFront: style.overhangFront,
    overhangSide: style.overhangSide,
    kerf: input.kerf ?? 0.125,
    benchCount: Math.max(1, Math.min(20, Math.floor(input.benchCount ?? 1))),

    legMaterialId,
    apronMaterialId: style.apronMaterialId,
    stretcherMaterialId: style.stretcherMaterialId,
    topMaterialId: style.topMaterialId,
    shelfMaterialId: "ply_1_2",
    pegboardMaterialId: "hdb_1_4",

    topConstruction: style.topConstruction,
    topLamCount,
    topLamOrientation,
    topSlabThickness: style.topSlabThickness ?? 0,
    topSheetLayers:
      style.topConstruction === "doubled-sheet"
        ? 2
        : style.topConstruction === "single-sheet"
          ? 1
          : 0,

    stretchers: { ...style.stretchers },
    joinery: input.joineryOverride ?? style.joinery,
    apronsOverlapLegs: style.apronsOverlapLegs ?? false,
    stretchersOverlapLegs: style.stretchersOverlapLegs ?? false,
    tenonLength: style.tenonLength ?? 0,
    legSplayDeg: style.legSplayDeg,
    knockdown: style.knockdown,
    vise: input.viseOverride ?? style.vise,
    dogHoles: style.dogHoles,
    dogHoleSpacing: style.dogHoleSpacing,

    casters,
    pegboard,
    pegboardHeight,
    toolWell: false,
    toolWellWidth: 4,

    drawerCount: input.drawerCount ?? style.defaultDrawerCount ?? 0,
    drawerLocation: input.drawerLocation ?? style.defaultDrawerLocation ?? "under-top",
    drawerSlideType: input.drawerSlideType ?? style.defaultDrawerSlideType ?? "metal",

    edgeBand: input.edgeBand ?? (style.topConstruction !== "slab"),
    finishCoats: input.finishCoats ?? 2,

    stockLengthPreference: input.stockLengthPreference ?? "any",
    customLumberPricePerFt: input.customLumberPricePerFt,
  };
}

function clamp(v: number, range: [number, number]) {
  return Math.max(range[0], Math.min(range[1], v));
}

// ----------------------------------------------------------------------
// Derived geometry helpers used by calculator, diagrams, and stability.
// ----------------------------------------------------------------------

export type DerivedGeometry = {
  // Top thickness (in) accounting for laminated / slab / doubled construction.
  topThickness: number;
  // VERTICAL run of the leg from floor (or top of caster) to underside of top.
  // Diagrams + stability use this to position the leg in space.
  legCutLength: number;
  // SLANT length of the leg blank — what you actually cross-cut. Equal to
  // legCutLength when splay = 0, longer otherwise.
  legCutBlankLength: number;
  // Horizontal footprint of the leg pair at top of leg (in):
  legSpanLong: number; // along front (= topLength - 2*overhangSide)
  legSpanShort: number; // front-to-back (= topDepth - 2*overhangFront)
  // Horizontal footprint at the FLOOR — wider than legSpan when splayed:
  floorSpanLong: number;
  floorSpanShort: number;
  // Effective leg cross-section dims. Convention: actualWidth eats the long
  // axis (narrow face along front), actualDepth eats the short axis.
  legCrossWidth: number;
  legCrossDepth: number;
  // Distance between inside faces of legs (where inset parts sit):
  insideLongTop: number;
  insideShortTop: number;
  insideLongFloor: number;
  insideShortFloor: number;
  // Cut lengths for each kind of part — already accounts for
  // overlap-vs-inset, tenon allowance, and splay.
  apronLongLength: number;
  apronShortLength: number;
  floorStretcherLongLength: number;
  floorStretcherShortLength: number;
  centerStretcherLength: number;
  shelfLengthLong: number;
  shelfDepthShort: number;
  // Caster height eaten from leg length:
  casterHeight: number;
};

export function deriveGeometry(c: BenchConfig): DerivedGeometry {
  const leg = getLumber(c.legMaterialId)!;
  const stretcher = getLumber(c.stretcherMaterialId);
  const casterHeight = c.casters ? 3.5 : 0; // 4" caster wheel + plate ~ 3-1/2"
  const topThickness = computeTopThickness(c);

  // Vertical run from floor (or top of caster) to underside of top.
  const verticalLegRun = Math.max(1, c.totalHeight - topThickness - casterHeight);
  // Splay tilts the leg in the short-axis plane; blank must be longer.
  const splayRad = (c.legSplayDeg * Math.PI) / 180;
  const cosSplay = Math.cos(splayRad);
  const legCutLength = verticalLegRun;
  const legCutBlankLength = verticalLegRun / cosSplay;

  const legSpanLong = c.topLength - 2 * c.overhangSide;
  const legSpanShort = c.topDepth - 2 * c.overhangFront;

  // Splay only widens the SHORT-axis (end view) footprint. Floor spread is
  // measured horizontally, so it's based on the VERTICAL run, not the slant.
  const splaySpread = 2 * verticalLegRun * Math.tan(splayRad);
  const floorSpanShort = legSpanShort + splaySpread;
  const floorSpanLong = legSpanLong; // long axis isn't splayed

  // Inside-of-leg spans. actualWidth (narrow) along long, actualDepth (wide)
  // along short — for 4x4 these are equal; for 2x4/2x6 the short axis eats
  // the wide face of the leg.
  const insideLongTop = legSpanLong - 2 * leg.actualWidth;
  const insideShortTop = legSpanShort - 2 * leg.actualDepth;
  const insideLongFloor = floorSpanLong - 2 * leg.actualWidth;
  const insideShortFloor = floorSpanShort - 2 * leg.actualDepth;

  // Tenon allowance — only for mortise joinery on INSET parts.
  const tenon = c.joinery === "mortise" ? c.tenonLength : 0;
  const apronTenon = c.apronsOverlapLegs ? 0 : 2 * tenon;
  const stretcherTenon = c.stretchersOverlapLegs ? 0 : 2 * tenon;

  // Part lengths. Overlap = part runs past the outside leg face → uses
  // legSpan; inset = part fits between legs → uses inside span (+ tenons).
  const apronLongLength = c.apronsOverlapLegs
    ? legSpanLong
    : insideLongTop + apronTenon;
  const apronShortLength = c.apronsOverlapLegs
    ? legSpanShort
    : insideShortTop + apronTenon;
  const floorStretcherLongLength = c.stretchersOverlapLegs
    ? floorSpanLong
    : insideLongFloor + stretcherTenon;
  const floorStretcherShortLength = c.stretchersOverlapLegs
    ? floorSpanShort
    : insideShortFloor + stretcherTenon;
  const centerStretcherLength = insideShortTop + (c.joinery === "mortise" ? 2 * tenon : 0);

  // Shelf sits on top of the floor stretcher pair. It fits between the legs
  // along the long axis (insideLongFloor). On the short axis it can span the
  // outer face of the long stretchers, but for a safe inset that doesn't
  // foul the legs we use insideShortFloor minus the stretcher's own depth on
  // each end (when stretchers run along the long axis between the legs).
  const stretcherCross = stretcher?.actualWidth ?? 1.5;
  const shelfLengthLong = insideLongFloor;
  const shelfDepthShort = c.stretchersOverlapLegs
    ? floorSpanShort - 2 * stretcherCross
    : insideShortFloor;

  return {
    topThickness,
    legCutLength,
    legCutBlankLength,
    legSpanLong,
    legSpanShort,
    floorSpanLong,
    floorSpanShort,
    legCrossWidth: leg.actualWidth,
    legCrossDepth: leg.actualDepth,
    insideLongTop,
    insideShortTop,
    insideLongFloor,
    insideShortFloor,
    apronLongLength,
    apronShortLength,
    floorStretcherLongLength,
    floorStretcherShortLength,
    centerStretcherLength,
    shelfLengthLong,
    shelfDepthShort,
    casterHeight,
  };
}

function computeTopThickness(c: BenchConfig): number {
  switch (c.topConstruction) {
    case "single-sheet": {
      const t = getSheet(c.topMaterialId)?.thickness ?? 0.75;
      return t;
    }
    case "doubled-sheet": {
      const t = getSheet(c.topMaterialId)?.thickness ?? 0.75;
      return t * 2;
    }
    case "laminated-2x": {
      const lum = getLumber(c.topMaterialId);
      if (!lum) return 1.5;
      switch (c.topLamOrientation) {
        case "flat-edge":
          // Boards lie flat, edges glued. Thickness = narrow face (1.5" for 2x).
          return lum.actualWidth;
        case "face-glue":
          // Boards stacked face to face. Thickness = N × narrow face.
          return lum.actualWidth * Math.max(1, c.topLamCount);
        case "on-edge":
          // Boards stand on edge, narrow edges glued. Thickness = wide face.
          return lum.actualDepth;
        default:
          return lum.actualWidth;
      }
    }
    case "slab":
      return c.topSlabThickness || 4;
  }
}

// ----------------------------------------------------------------------
// Drawer geometry
// ----------------------------------------------------------------------

export type DrawerGeometry = {
  // Whole-bank dimensions (the opening the bank occupies in the bench frame):
  bankWidth: number; // along the long axis (or short, for below-shelf banks)
  bankHeight: number; // total vertical opening (sum of per-drawer heights + gaps)
  bankDepth: number; // front-to-back
  // Per-drawer rough opening:
  openingWidth: number;
  openingHeight: number;
  // Drawer-box exterior dimensions (after slide / runner clearance):
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  // False front overlay (sits in front of the box, fills the rough opening):
  falseFrontWidth: number;
  falseFrontHeight: number;
  // Slide clearance per side used (each side gets boxWidth + slideClearance/2):
  slideClearancePerSide: number;
  // Warnings (e.g. "drawer would have negative height — skipping").
  warnings: string[];
};

export function deriveDrawerGeometry(
  c: BenchConfig,
  g: DerivedGeometry,
): DrawerGeometry | null {
  if (c.drawerCount <= 0) return null;

  const apron = getLumber(c.apronMaterialId);
  const apronFaceDim = apron?.actualDepth ?? 5.5;
  const slideClearanceTotal = c.drawerSlideType === "metal" ? 1 : 0.75;
  const slideClearancePerSide = slideClearanceTotal / 2;
  const warnings: string[] = [];

  let bankWidth: number;
  let bankHeight: number;
  const bankDepth = Math.max(8, c.topDepth - 2); // 1" front + 1" back clearance

  if (c.drawerLocation === "under-top") {
    // Row of N drawers across the long axis, between the front and back aprons.
    bankWidth = Math.max(0, g.insideLongTop);
    bankHeight = apronFaceDim - 0.5; // small clearance under top + above stretcher
  } else {
    // Vertical column of N drawers at one end. Width = ~1/3 of insideLongTop
    // up to 20", capped so a long bench doesn't get a giant drawer column.
    bankWidth = Math.min(20, Math.max(12, g.insideLongTop / 3));
    const shelfHeight = c.stretchers.lowerShelf ? c.stretchers.shelfHeight : 0;
    const bottomOfTop = c.totalHeight - g.topThickness;
    bankHeight = Math.max(0, bottomOfTop - shelfHeight - 0.5);
  }

  // Per-drawer divisions.
  const perDrawerHeightRaw =
    c.drawerLocation === "under-top"
      ? bankHeight // single horizontal row → each drawer is full bank height
      : bankHeight / c.drawerCount;
  const perDrawerWidthRaw =
    c.drawerLocation === "under-top"
      ? bankWidth / c.drawerCount
      : bankWidth;

  const interDrawerGap = c.drawerLocation === "below-shelf" ? 0.25 : 0;
  const openingHeight = Math.max(0, perDrawerHeightRaw - interDrawerGap);
  const openingWidth = Math.max(0, perDrawerWidthRaw - 0.125); // saw kerf between drawers

  const boxWidth = openingWidth - slideClearanceTotal;
  const boxHeight = openingHeight - 0.125; // clearance under top of opening
  const boxDepth = bankDepth - 1; // leave 1" behind for slide / runner stop

  if (boxWidth < 6 || boxHeight < 2 || boxDepth < 4) {
    warnings.push(
      `Drawer opening too small (${boxWidth.toFixed(1)}" × ${boxHeight.toFixed(1)}" × ${boxDepth.toFixed(1)}"). Reduce drawer count or change location.`,
    );
  }

  return {
    bankWidth,
    bankHeight,
    bankDepth,
    openingWidth,
    openingHeight,
    boxWidth,
    boxHeight,
    boxDepth,
    falseFrontWidth: openingWidth,
    falseFrontHeight: openingHeight,
    slideClearancePerSide,
    warnings,
  };
}

function computeAutoLamCount(
  materialId: string,
  orientation: TopLamOrientation,
  topDepth: number,
  styleDefault: number | undefined,
): number {
  const lum = getLumber(materialId);
  if (!lum) return styleDefault ?? 2;
  switch (orientation) {
    case "on-edge":
      // N narrow edges (actualWidth each) fill topDepth.
      return Math.max(2, Math.round(topDepth / lum.actualWidth));
    case "flat-edge":
      // N wide faces (actualDepth each) fill topDepth.
      return Math.max(2, styleDefault ?? Math.round(topDepth / lum.actualDepth));
    case "face-glue":
      // Stack count comes from the style — face-glue doesn't span depth.
      return Math.max(1, styleDefault ?? 2);
  }
}
