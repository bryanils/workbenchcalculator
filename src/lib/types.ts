// Shared types for calculator output and config.

export type Joinery = "pocket" | "lag" | "mortise";

export type StockLengthPreference = number | "any";

export type BenchConfig = {
  // All dimensions in inches internally
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

export type CalcResult = {
  cutList: CutListItem[];
  lumberBoards: LumberBoardOut[];
  sheetLayouts: SheetLayoutOut[];
  hardware: HardwareItem[];
  tools: ToolItem[];
  steps: AssemblyStep[];
  warnings: string[];
  totals: CalcTotals;
};
