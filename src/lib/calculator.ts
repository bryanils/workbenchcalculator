import {
  getLumber,
  getSheet,
  type LumberSpec,
  type SheetSpec,
} from "./materials";
import { packLumberBoards, type LumberCutInput } from "./packLumber";
import { packSheets, type SheetCutInput } from "./packSheet";
import { computeHardware } from "./hardware";
import { computeTools } from "./tools";
import { computeSteps } from "./steps";
import type {
  BenchConfig,
  CalcResult,
  CutListItem,
  HardwareItem,
  LumberBoardOut,
  SheetLayoutOut,
} from "./types";

// Approximate density (lb / cubic inch) for weight estimate.
// Softwood ~0.0173, plywood ~0.025, hardboard ~0.030
const DENSITY_LUMBER = 0.0173;
const DENSITY_SHEET = 0.025;

export function calculate(config: BenchConfig): CalcResult {
  const warnings: string[] = [];

  const leg = getLumber(config.legMaterialId);
  const apron = getLumber(config.apronMaterialId);
  const top = getSheet(config.topMaterialId);
  const shelf = config.includeShelf ? getSheet(config.shelfMaterialId) : undefined;
  const pegboardSpec = config.pegboard ? getSheet(config.pegboardMaterialId) : undefined;

  if (!leg) return errorResult(["Invalid leg material"]);
  if (!apron) return errorResult(["Invalid apron material"]);
  if (!top) return errorResult(["Invalid top material"]);
  if (config.includeShelf && !shelf) return errorResult(["Invalid shelf material"]);
  if (config.pegboard && !pegboardSpec) return errorResult(["Invalid pegboard material"]);

  if (config.topLength <= 0 || config.topWidth <= 0 || config.totalHeight <= 0) {
    return errorResult(["Dimensions must be positive"]);
  }

  // Caster height eats into leg length
  const casterHeight = config.casters ? 3 : 0;
  const legCross = leg.actualWidth;
  const baseLength = config.topLength - 2 * config.overhang;
  const baseWidth = config.topWidth - 2 * config.overhang;

  if (baseLength <= 2 * legCross || baseWidth <= 2 * legCross) {
    return errorResult(["Overhang too large for top size — legs would overlap"]);
  }

  const topThickness = top.thickness * (config.doubledTop ? 2 : 1);
  const legHeight = config.totalHeight - topThickness - casterHeight;
  if (legHeight <= 0) {
    return errorResult(["Top thickness + casters exceed total height"]);
  }

  const longApron = baseLength - 2 * legCross;
  const shortApron = baseWidth - 2 * legCross;

  if (leg.actualWidth !== leg.actualDepth) {
    warnings.push(
      `${leg.label} legs aren't square — calculator assumes a ${legCross}" × ${legCross}" footprint at each corner. Adjust apron lengths by hand if you orient them differently.`,
    );
  }
  if (config.includeShelf && (config.shelfHeight <= 0 || config.shelfHeight >= legHeight)) {
    warnings.push(
      `Shelf height (${config.shelfHeight}") should be between 0 and ${legHeight}" — adjust to fit between the floor and the apron.`,
    );
  }

  // ======================================================================
  // Cut list — each row gets a unique partCode
  // ======================================================================
  const cutList: CutListItem[] = [];
  let pc = 1;
  const code = () => `P${pc++}`;

  // Legs
  cutList.push({
    partCode: code(),
    qty: 4,
    materialId: leg.id,
    materialLabel: leg.label,
    materialKind: "lumber",
    length: legHeight,
    purpose: "Leg",
  });

  // Long aprons (front + back)
  cutList.push({
    partCode: code(),
    qty: 2,
    materialId: apron.id,
    materialLabel: apron.label,
    materialKind: "lumber",
    length: longApron,
    purpose: "Top apron — long (front/back)",
  });
  // Short aprons (sides)
  cutList.push({
    partCode: code(),
    qty: 2,
    materialId: apron.id,
    materialLabel: apron.label,
    materialKind: "lumber",
    length: shortApron,
    purpose: "Top apron — short (sides)",
  });

  if (config.middleStretcher) {
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: apron.id,
      materialLabel: apron.label,
      materialKind: "lumber",
      length: shortApron,
      purpose: "Center stretcher (under top)",
    });
  }

  if (config.includeShelf) {
    cutList.push({
      partCode: code(),
      qty: 2,
      materialId: apron.id,
      materialLabel: apron.label,
      materialKind: "lumber",
      length: longApron,
      purpose: "Shelf rail — long (front/back)",
    });
    cutList.push({
      partCode: code(),
      qty: 2,
      materialId: apron.id,
      materialLabel: apron.label,
      materialKind: "lumber",
      length: shortApron,
      purpose: "Shelf rail — short (sides)",
    });
  }

  if (config.diagonalBraces) {
    const braceLen = Math.round(Math.sqrt(2) * Math.min(shortApron, legHeight * 0.6));
    cutList.push({
      partCode: code(),
      qty: 2,
      materialId: apron.id,
      materialLabel: apron.label,
      materialKind: "lumber",
      length: braceLen,
      purpose: "Diagonal brace (sides)",
    });
  }

  // Top sheet
  cutList.push({
    partCode: code(),
    qty: 1,
    materialId: top.id,
    materialLabel: top.label,
    materialKind: "sheet",
    length: config.topLength,
    width: config.topWidth,
    thickness: top.thickness,
    purpose: "Top surface",
  });
  if (config.doubledTop) {
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: top.id,
      materialLabel: top.label,
      materialKind: "sheet",
      length: config.topLength,
      width: config.topWidth,
      thickness: top.thickness,
      purpose: "Top — second layer (laminated below)",
    });
  }

  // Shelf sheet
  if (config.includeShelf && shelf) {
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: shelf.id,
      materialLabel: shelf.label,
      materialKind: "sheet",
      length: longApron,
      width: shortApron,
      thickness: shelf.thickness,
      purpose: "Lower shelf",
    });
  }

  // Pegboard
  if (config.pegboard && pegboardSpec) {
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: pegboardSpec.id,
      materialLabel: pegboardSpec.label,
      materialKind: "sheet",
      length: config.topLength,
      width: config.pegboardHeight,
      thickness: pegboardSpec.thickness,
      purpose: "Pegboard back panel",
    });
  }

  // ======================================================================
  // Pack lumber per material into stock boards
  // ======================================================================
  const lumberBoards: LumberBoardOut[] = [];
  const lumberInputsById = new Map<string, LumberCutInput[]>();
  for (const item of cutList) {
    if (item.materialKind !== "lumber") continue;
    const list = lumberInputsById.get(item.materialId) ?? [];
    for (let i = 0; i < item.qty; i++) {
      list.push({ len: item.length, partCode: item.partCode, purpose: item.purpose });
    }
    lumberInputsById.set(item.materialId, list);
  }

  let lumberFt = 0;
  for (const [matId, inputs] of lumberInputsById) {
    const spec = getLumber(matId)!;
    const { boards, oversize } = packLumberBoards(
      inputs,
      spec.stockLengths,
      config.kerf,
      config.stockLengthPreference,
    );
    for (const o of oversize) {
      warnings.push(
        `${spec.label} cut of ${o.len.toFixed(2)}" (${o.purpose}) exceeds longest stock — splice or special-order.`,
      );
    }
    for (const b of boards) {
      lumberBoards.push({
        materialId: spec.id,
        materialLabel: spec.label,
        stockLen: b.stockLen,
        cuts: b.cuts,
        wasteLen: b.wasteLen,
      });
      lumberFt += b.stockLen / 12;
    }
  }

  // ======================================================================
  // Pack sheets per material into 48x96 sheets
  // ======================================================================
  const sheetLayouts: SheetLayoutOut[] = [];
  const sheetInputsById = new Map<string, SheetCutInput[]>();
  for (const item of cutList) {
    if (item.materialKind !== "sheet" || item.width === undefined) continue;
    const list = sheetInputsById.get(item.materialId) ?? [];
    for (let i = 0; i < item.qty; i++) {
      list.push({
        w: item.length,
        h: item.width,
        partCode: item.partCode,
        purpose: item.purpose,
      });
    }
    sheetInputsById.set(item.materialId, list);
  }

  let sheetSqFt = 0;
  for (const [matId, inputs] of sheetInputsById) {
    const spec = getSheet(matId)!;
    const { layouts, oversize } = packSheets(
      inputs,
      spec.width,
      spec.height,
      config.kerf,
    );
    for (const o of oversize) {
      warnings.push(
        `${spec.label} cut ${o.w}" × ${o.h}" (${o.purpose}) doesn't fit in a single ${spec.width}" × ${spec.height}" sheet.`,
      );
    }
    for (const l of layouts) {
      sheetLayouts.push({
        materialId: spec.id,
        materialLabel: spec.label,
        sheetW: l.sheetW,
        sheetH: l.sheetH,
        pieces: l.pieces,
        usedArea: l.usedArea,
      });
      sheetSqFt += (spec.width * spec.height) / 144;
    }
  }

  // ======================================================================
  // Build materials shopping list (lumber + sheet boards)
  // ======================================================================
  const materialsLines: HardwareItem[] = [];
  // Aggregate lumber by (material, stock length)
  const lumberKey = new Map<string, { qty: number; lenIn: number; spec: LumberSpec }>();
  for (const b of lumberBoards) {
    const k = `${b.materialId}|${b.stockLen}`;
    const spec = getLumber(b.materialId)!;
    const cur = lumberKey.get(k) ?? { qty: 0, lenIn: b.stockLen, spec };
    cur.qty += 1;
    lumberKey.set(k, cur);
  }
  for (const { qty, lenIn, spec } of lumberKey.values()) {
    const ft = lenIn / 12;
    const perFt = config.customLumberPricePerFt ?? spec.pricePerFt;
    materialsLines.push({
      qty,
      itemLabel: `${spec.label} — ${ft} ft (${lenIn}")`,
      note: `Stick lumber, ${lenIn}" long`,
      estimatedCost: perFt ? perFt * ft * qty : undefined,
    });
  }

  const sheetKey = new Map<string, { qty: number; spec: SheetSpec }>();
  for (const l of sheetLayouts) {
    const spec = getSheet(l.materialId)!;
    const cur = sheetKey.get(spec.id) ?? { qty: 0, spec };
    cur.qty += 1;
    sheetKey.set(spec.id, cur);
  }
  for (const { qty, spec } of sheetKey.values()) {
    materialsLines.push({
      qty,
      itemLabel: `${spec.label} — ${spec.width}"×${spec.height}" sheet`,
      note: "Full sheet from big-box / lumberyard",
      estimatedCost: spec.pricePerSheet ? spec.pricePerSheet * qty : undefined,
    });
  }

  // ======================================================================
  // Hardware
  // ======================================================================
  const apronJoints = 4 * 2; // 4 corners × 2 aprons each = 8 joints
  const shelfJoints = config.includeShelf ? 4 * 2 : 0;
  const middleStretcherJoints = config.middleStretcher ? 2 : 0;

  // Top fastening: ~ 1 screw per 8" along apron perimeter
  const apronPerimeter = 2 * longApron + 2 * shortApron;
  const topFastenPoints = Math.max(8, Math.ceil(apronPerimeter / 8));
  const doublerFastenPoints = config.doubledTop
    ? Math.ceil((config.topLength * config.topWidth) / (12 * 12))
    : 0;
  const shelfFastenPoints = config.includeShelf
    ? Math.max(6, Math.ceil(apronPerimeter / 10))
    : 0;
  const pegboardFastenPoints = config.pegboard
    ? Math.max(6, Math.ceil((config.topLength * config.pegboardHeight) / (12 * 12)))
    : 0;
  const toolWellJoints = config.toolWell ? 6 : 0;
  const diagonalBraceJoints = config.diagonalBraces ? 4 : 0;

  // Surface area for finish: top (both faces if doubled top, exposed faces), shelf, legs, aprons exterior.
  let surfaceArea = 0;
  // top: both faces + edges
  surfaceArea += 2 * config.topLength * config.topWidth;
  surfaceArea += 2 * (config.topLength + config.topWidth) * topThickness;
  // shelf
  if (config.includeShelf && shelf) {
    surfaceArea += 2 * longApron * shortApron;
    surfaceArea += 2 * (longApron + shortApron) * shelf.thickness;
  }
  // legs (4 sides × 4 legs)
  surfaceArea += 4 * 4 * leg.actualWidth * legHeight;
  // aprons (long + short, both faces, exterior height)
  surfaceArea += 2 * (longApron * 2 + shortApron * 2) * apron.actualDepth;
  if (config.pegboard && pegboardSpec) {
    surfaceArea += 2 * config.topLength * config.pegboardHeight;
  }
  const surfaceSqFt = surfaceArea / 144;

  const perimeterFt = (2 * (config.topLength + config.topWidth)) / 12;

  const hardware = computeHardware(config, {
    apronJoints,
    shelfJoints,
    middleStretcherJoints,
    topFastenPoints,
    shelfFastenPoints,
    pegboardFastenPoints,
    doublerFastenPoints,
    toolWellJoints,
    diagonalBraceJoints,
    surfaceSqFt,
    perimeterFt,
  });

  // ======================================================================
  // Tools + steps
  // ======================================================================
  const tools = computeTools(config);
  const steps = computeSteps({ config, longApron, shortApron, legHeight });

  // ======================================================================
  // Totals
  // ======================================================================
  const materialsCost =
    materialsLines.reduce((s, m) => s + (m.estimatedCost ?? 0), 0) +
    hardware.reduce((s, h) => s + (h.estimatedCost ?? 0), 0);

  // Weight: lumber boards + sheets
  let weightLb = 0;
  for (const b of lumberBoards) {
    const spec = getLumber(b.materialId)!;
    weightLb += b.stockLen * spec.actualWidth * spec.actualDepth * DENSITY_LUMBER;
  }
  for (const l of sheetLayouts) {
    const spec = getSheet(l.materialId)!;
    weightLb += spec.width * spec.height * spec.thickness * DENSITY_SHEET;
  }

  // Materials lines + hardware live in two sections; we return both via hardware list
  const combinedShopping: HardwareItem[] = [...materialsLines, ...hardware];

  return {
    cutList,
    lumberBoards,
    sheetLayouts,
    hardware: combinedShopping,
    tools,
    steps,
    warnings,
    totals: {
      lumberFt,
      sheetSqFt,
      surfaceAreaSqFt: surfaceSqFt,
      estimatedCost: materialsCost > 0 ? materialsCost : undefined,
      weightLb,
    },
  };
}

function errorResult(warnings: string[]): CalcResult {
  return {
    cutList: [],
    lumberBoards: [],
    sheetLayouts: [],
    hardware: [],
    tools: [],
    steps: [],
    warnings,
    totals: { lumberFt: 0, sheetSqFt: 0, surfaceAreaSqFt: 0, weightLb: 0 },
  };
}

export type { BenchConfig, CalcResult, CutListItem } from "./types";
