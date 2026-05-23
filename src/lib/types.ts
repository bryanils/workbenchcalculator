// Shared types for calculator output and config.

import type {
  BenchStyleId,
  DrawerLocation,
  DrawerSlideType,
  KnockdownHardwareKind,
  StretcherLayout,
  TopConstruction,
  TopLamOrientation,
  ViseKind,
} from "./styles";

export type Joinery = "pocket" | "lag" | "mortise";

export type StockLengthPreference = number | "any";

// Stuff the user actually sets through the UI. Everything else is derived
// from the chosen style profile + these three dimensions.
export type SimpleInputs = {
  styleId: BenchStyleId;
  topLength: number;
  topDepth: number;
  totalHeight: number;
  // Optional overrides (advanced toggles):
  casters?: boolean;
  pegboard?: boolean;
  pegboardHeight?: number;
  edgeBand?: boolean;
  finishCoats?: number;
  customLumberPricePerFt?: number;
  stockLengthPreference?: StockLengthPreference;
  joineryOverride?: Joinery;
  viseOverride?: ViseKind;
  kerf?: number; // defaults to 0.125
  // How many identical benches to build at once. Pieces are pooled across
  // benches so the sheet/lumber packer can tile them jointly for better yield.
  benchCount?: number; // defaults to 1
  // Drawer overrides (any field provided overrides the style default):
  drawerCount?: number;
  drawerLocation?: DrawerLocation;
  drawerSlideType?: DrawerSlideType;
};

// Full derived bench configuration consumed by the calculator. Most callers
// produce this via deriveBenchConfig(simple). It is also returned in the
// build sheet so the user can see what the style chose for them.
export type BenchConfig = {
  styleId: BenchStyleId;

  // dimensions (inches)
  topLength: number;
  topDepth: number;
  totalHeight: number;
  overhangFront: number;
  overhangSide: number;
  kerf: number;
  benchCount: number;

  // materials
  legMaterialId: string;
  apronMaterialId: string;
  stretcherMaterialId: string;
  topMaterialId: string;
  shelfMaterialId: string;
  pegboardMaterialId: string;

  // top construction
  topConstruction: TopConstruction;
  topLamCount: number; // number of boards laminated for laminated-2x tops
  topLamOrientation: TopLamOrientation; // flat-edge / face-glue / on-edge
  topSlabThickness: number; // thickness for "slab" tops (in)
  topSheetLayers: number; // 1 or 2 (for sheet tops)

  // stretchers / shelf / bracing
  stretchers: StretcherLayout;

  // joinery + style features
  joinery: Joinery;
  // Aprons run past the outside leg faces (Nicholson, 2x4-basics) vs inset
  // between them. Affects part length and corner joinery.
  apronsOverlapLegs: boolean;
  stretchersOverlapLegs: boolean;
  // Tenon length per joint (only used when joinery === "mortise" and the
  // part is INSET between legs, not overlapping them).
  tenonLength: number;
  legSplayDeg: number;
  knockdown: boolean;
  knockdownHardwareKind?: KnockdownHardwareKind;
  vise: ViseKind;
  dogHoles: boolean;
  dogHoleSpacing: number;

  // accessories
  casters: boolean;
  pegboard: boolean;
  pegboardHeight: number;
  toolWell: boolean;
  toolWellWidth: number;

  // drawers (0 = no drawers)
  drawerCount: number;
  drawerLocation: DrawerLocation;
  drawerSlideType: DrawerSlideType;

  // finishing
  edgeBand: boolean;
  finishCoats: number;

  // pricing / stock
  stockLengthPreference: StockLengthPreference;
  customLumberPricePerFt?: number;
};

export type CutListItem = {
  partCode: string;       // P1, P2, ...
  qty: number;
  materialId: string;
  materialLabel: string;
  materialKind: "lumber" | "sheet";
  length: number;
  width?: number;
  thickness?: number;
  purpose: string;
};

export type HardwareItem = {
  qty: number;
  itemLabel: string;
  unit?: string;
  note?: string;
  estimatedCost?: number;
};

export type AssemblyStep = {
  n: number;
  title: string;
  body: string;
  fasteners?: string;
  tools?: string[];
};

export type ToolItem = {
  name: string;
  required: boolean;
  note?: string;
};

export type LumberBoardOut = {
  materialId: string;
  materialLabel: string;
  stockLen: number;
  cuts: { len: number; partCode: string; purpose: string }[];
  wasteLen: number;
};

export type SheetLayoutOut = {
  materialId: string;
  materialLabel: string;
  nominalSheetW: number;
  nominalSheetH: number;
  sheetW: number;
  sheetH: number;
  pieces: {
    x: number; y: number; w: number; h: number;
    partCode: string; purpose: string; rotated: boolean;
  }[];
  usedArea: number;
};

export type CalcTotals = {
  lumberFt: number;
  sheetSqFt: number;
  surfaceAreaSqFt: number;
  estimatedCost?: number;
  weightLb: number;
};

export type StabilityVerdict = "solid" | "acceptable" | "marginal" | "unstable";

export type StabilityReport = {
  verdict: StabilityVerdict;
  score: number; // 0 - 100
  // Beam deflection of the top under a 200 lb point load at center of the
  // longest unsupported apron span (inches):
  topSagInches: number;
  topSagLimitInches: number; // suggested max (typically L/240)
  // Approximate lateral force at top edge required to rack the base 1°
  // (lower = easier to rack = less stable). In pounds-force:
  rackingResistanceLbf: number;
  // Footprint width vs CoG height ratio. Higher = harder to tip:
  tipRatio: number;
  // Estimated bench weight. Heavier base = better hand-tool work:
  baseWeightLb: number;
  // Plain-English findings:
  notes: string[];
  warnings: string[];
};

export type CalcResult = {
  cutList: CutListItem[];
  lumberBoards: LumberBoardOut[];
  sheetLayouts: SheetLayoutOut[];
  hardware: HardwareItem[];
  tools: ToolItem[];
  steps: AssemblyStep[];
  warnings: string[];
  stability: StabilityReport;
  totals: CalcTotals;
  // Echo of the derived structural config so the UI can show the user what
  // their style choice "picked" for them:
  derived: BenchConfig;
};
