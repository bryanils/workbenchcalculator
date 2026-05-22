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
import { deriveBenchConfig, deriveDrawerGeometry, deriveGeometry } from "./derive";
import { assessStability } from "./stability";
import type {
  BenchConfig,
  CalcResult,
  CutListItem,
  HardwareItem,
  LumberBoardOut,
  SheetLayoutOut,
  SimpleInputs,
} from "./types";

const DENSITY_LUMBER = 0.0173;
const DENSITY_SHEET = 0.025;

export function calculateFromInputs(input: SimpleInputs): CalcResult {
  return calculate(deriveBenchConfig(input));
}

export function calculate(config: BenchConfig): CalcResult {
  const warnings: string[] = [];

  const leg = getLumber(config.legMaterialId);
  const apron = getLumber(config.apronMaterialId);
  const stretcherLum = getLumber(config.stretcherMaterialId);

  if (!leg) return errorResult(["Invalid leg material"], config);
  if (!apron) return errorResult(["Invalid apron material"], config);
  if (!stretcherLum) return errorResult(["Invalid stretcher material"], config);
  if (config.topLength <= 0 || config.topDepth <= 0 || config.totalHeight <= 0) {
    return errorResult(["Dimensions must be positive"], config);
  }

  const g = deriveGeometry(config);
  if (g.legCutLength <= 0) {
    return errorResult(["Top thickness + casters exceed total height"], config);
  }
  if (g.insideLongTop <= 0 || g.insideShortTop <= 0) {
    return errorResult([
      "Overhang too large for top size — legs would overlap",
    ], config);
  }

  // ======================================================================
  // CUT LIST
  // ======================================================================
  const cutList: CutListItem[] = [];
  let pc = 1;
  const code = () => `P${pc++}`;

  // ----- Legs -----
  const legPurposeParts: string[] = [];
  if (config.legSplayDeg > 0) {
    legPurposeParts.push(
      `cut top at ${config.legSplayDeg}° for splay; blank length is slant`,
    );
  }
  const legPurposeSuffix = legPurposeParts.length > 0
    ? ` (${legPurposeParts.join("; ")})`
    : "";
  cutList.push({
    partCode: code(),
    qty: 4,
    materialId: leg.id,
    materialLabel: leg.label,
    materialKind: "lumber",
    length: g.legCutBlankLength,
    purpose: `Leg${legPurposeSuffix}`,
  });

  // ----- Top aprons -----
  const apronJoineryNote = apronJoineryDescription(config);
  pushApron(
    cutList,
    code,
    apron,
    g.apronLongLength,
    `Top apron — long (front/back)${apronJoineryNote}`,
  );
  pushApron(
    cutList,
    code,
    apron,
    g.apronShortLength,
    `Top apron — short (sides/ends)${apronJoineryNote}`,
  );

  // ----- Center stretcher under top -----
  if (config.stretchers.centerStretcher) {
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: stretcherLum.id,
      materialLabel: stretcherLum.label,
      materialKind: "lumber",
      length: g.centerStretcherLength,
      purpose: "Center stretcher (under top, prevents sag)",
    });
  }

  // ----- Floor stretchers -----
  if (config.stretchers.floorStretchers) {
    const stretcherJoineryNote = stretcherJoineryDescription(config);
    cutList.push({
      partCode: code(),
      qty: 2,
      materialId: stretcherLum.id,
      materialLabel: stretcherLum.label,
      materialKind: "lumber",
      length: g.floorStretcherLongLength,
      purpose: `Floor stretcher — long (${formatFromFloor(config.stretchers.floorStretcherHeight)})${stretcherJoineryNote}`,
    });
    cutList.push({
      partCode: code(),
      qty: 2,
      materialId: stretcherLum.id,
      materialLabel: stretcherLum.label,
      materialKind: "lumber",
      length: g.floorStretcherShortLength,
      purpose: `Floor stretcher — short (${formatFromFloor(config.stretchers.floorStretcherHeight)})${stretcherJoineryNote}`,
    });
  }

  // ----- Shelf rails + sheet -----
  if (config.stretchers.lowerShelf) {
    if (!config.stretchers.floorStretchers) {
      cutList.push({
        partCode: code(),
        qty: 2,
        materialId: stretcherLum.id,
        materialLabel: stretcherLum.label,
        materialKind: "lumber",
        length: g.floorStretcherLongLength,
        purpose: "Shelf rail — long",
      });
      cutList.push({
        partCode: code(),
        qty: 2,
        materialId: stretcherLum.id,
        materialLabel: stretcherLum.label,
        materialKind: "lumber",
        length: g.floorStretcherShortLength,
        purpose: "Shelf rail — short",
      });
    }
    const shelf = getSheet(config.shelfMaterialId);
    if (shelf) {
      cutList.push({
        partCode: code(),
        qty: 1,
        materialId: shelf.id,
        materialLabel: shelf.label,
        materialKind: "sheet",
        length: g.shelfLengthLong,
        width: g.shelfDepthShort,
        thickness: shelf.thickness,
        purpose: `Lower shelf (sits on stretchers at ${formatFromFloor(config.stretchers.shelfHeight)})`,
      });
    }
  }

  // ----- Diagonal corner braces (only when no floor stretcher box) -----
  if (config.stretchers.diagonalBraces && !config.stretchers.floorStretchers) {
    // Real brace runs at 45° from top-apron-near-one-leg to bottom-of-far-leg.
    // Length = hypotenuse of (insideShortTop, legCutLength * 0.6)
    const dy = g.legCutLength * 0.6;
    const dx = g.insideShortTop * 0.6;
    const braceLen = Math.round(Math.sqrt(dx * dx + dy * dy));
    cutList.push({
      partCode: code(),
      qty: 4, // 2 per end (one per direction)
      materialId: apron.id,
      materialLabel: apron.label,
      materialKind: "lumber",
      length: braceLen,
      purpose: "Diagonal brace (corner anti-rack)",
    });
  }

  // ----- Top -----
  switch (config.topConstruction) {
    case "single-sheet": {
      const top = getSheet(config.topMaterialId)!;
      cutList.push({
        partCode: code(),
        qty: 1,
        materialId: top.id,
        materialLabel: top.label,
        materialKind: "sheet",
        length: config.topLength,
        width: config.topDepth,
        thickness: top.thickness,
        purpose: "Top surface (single sheet)",
      });
      break;
    }
    case "doubled-sheet": {
      const top = getSheet(config.topMaterialId)!;
      cutList.push({
        partCode: code(),
        qty: 1,
        materialId: top.id,
        materialLabel: top.label,
        materialKind: "sheet",
        length: config.topLength,
        width: config.topDepth,
        thickness: top.thickness,
        purpose: "Top surface — upper sheet (face up)",
      });
      cutList.push({
        partCode: code(),
        qty: 1,
        materialId: top.id,
        materialLabel: top.label,
        materialKind: "sheet",
        length: config.topLength,
        width: config.topDepth,
        thickness: top.thickness,
        purpose: "Top surface — lower sheet (glue+screw laminated below)",
      });
      break;
    }
    case "laminated-2x": {
      const lum = getLumber(config.topMaterialId)!;
      const orientationLabel = orientationDescription(config.topLamOrientation);
      cutList.push({
        partCode: code(),
        qty: Math.max(1, config.topLamCount),
        materialId: lum.id,
        materialLabel: lum.label,
        materialKind: "lumber",
        length: config.topLength,
        purpose: `Top lamination — ${config.topLamCount} × ${lum.label} ${orientationLabel}, glued to form a ${g.topThickness.toFixed(2)}" thick top`,
      });
      break;
    }
    case "slab": {
      // Roubo-style: treated as a single thick laminated slab. We list it as
      // lumber rows: count = max(1, ceil(slabThickness / actualWidth)) pieces.
      const lum = getLumber(config.topMaterialId)!;
      const pieces = Math.max(2, Math.ceil(config.topSlabThickness / lum.actualWidth));
      cutList.push({
        partCode: code(),
        qty: pieces,
        materialId: lum.id,
        materialLabel: lum.label,
        materialKind: "lumber",
        length: config.topLength,
        purpose: `Slab top — ${pieces} × ${lum.label} laminated on edge, total ~${config.topSlabThickness}" thick`,
      });
      break;
    }
  }

  // ----- Vise (block / chop) -----
  if (config.vise === "leg-vise") {
    // The chop runs from the floor up to the top; the parallel guide goes
    // through the front leg about 18" below the top.
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: "2x6",
      materialLabel: getLumber("2x6")?.label ?? "2x6",
      materialKind: "lumber",
      length: config.totalHeight,
      purpose: "Leg-vise chop (runs floor-to-top, front face of left leg)",
    });
    cutList.push({
      partCode: code(),
      qty: 1,
      materialId: "2x4",
      materialLabel: getLumber("2x4")?.label ?? "2x4",
      materialKind: "lumber",
      length: 18,
      purpose: "Leg-vise parallel guide",
    });
  }

  // ----- Drawers -----
  const drawerGeo = deriveDrawerGeometry(config, g);
  if (drawerGeo) {
    for (const w of drawerGeo.warnings) warnings.push(w);
    if (drawerGeo.warnings.length === 0) {
      const sideMat = getSheet("ply_1_2")!;
      const bottomMat = getSheet("ply_1_4")!;
      const frontMat = getSheet("ply_3_4")!;

      const slideNote =
        config.drawerSlideType === "metal"
          ? `Side-mount ball-bearing slides (${drawerGeo.slideClearancePerSide}" clearance each side)`
          : `Shop-made wooden runner with ${drawerGeo.slideClearancePerSide}" clearance each side`;
      const placementNote =
        config.drawerLocation === "under-top"
          ? `Hangs under top, ${config.drawerCount} drawer${config.drawerCount === 1 ? "" : "s"} across the long axis`
          : `Vertical column at one end, ${config.drawerCount} drawer${config.drawerCount === 1 ? "" : "s"} stacked`;

      // Per-drawer parts × drawerCount
      // 2 sides per drawer
      cutList.push({
        partCode: code(),
        qty: config.drawerCount * 2,
        materialId: sideMat.id,
        materialLabel: sideMat.label,
        materialKind: "sheet",
        length: drawerGeo.boxDepth,
        width: drawerGeo.boxHeight,
        thickness: sideMat.thickness,
        purpose: `Drawer side (${slideNote}). ${placementNote}.`,
      });
      // 1 front per drawer (the inner front, not the false front)
      cutList.push({
        partCode: code(),
        qty: config.drawerCount,
        materialId: sideMat.id,
        materialLabel: sideMat.label,
        materialKind: "sheet",
        length: drawerGeo.boxWidth,
        width: drawerGeo.boxHeight,
        thickness: sideMat.thickness,
        purpose: "Drawer front (inner, behind false front)",
      });
      // 1 back per drawer
      cutList.push({
        partCode: code(),
        qty: config.drawerCount,
        materialId: sideMat.id,
        materialLabel: sideMat.label,
        materialKind: "sheet",
        length: drawerGeo.boxWidth,
        width: drawerGeo.boxHeight,
        thickness: sideMat.thickness,
        purpose: "Drawer back",
      });
      // 1 bottom per drawer
      cutList.push({
        partCode: code(),
        qty: config.drawerCount,
        materialId: bottomMat.id,
        materialLabel: bottomMat.label,
        materialKind: "sheet",
        length: drawerGeo.boxWidth,
        width: drawerGeo.boxDepth,
        thickness: bottomMat.thickness,
        purpose: "Drawer bottom (1/4\" ply, captured in dadoes)",
      });
      // 1 false front per drawer
      cutList.push({
        partCode: code(),
        qty: config.drawerCount,
        materialId: frontMat.id,
        materialLabel: frontMat.label,
        materialKind: "sheet",
        length: drawerGeo.falseFrontWidth,
        width: drawerGeo.falseFrontHeight,
        thickness: frontMat.thickness,
        purpose: "Drawer false front (3/4\" ply, screws on from inside)",
      });
    }
  }

  // ----- Pegboard -----
  if (config.pegboard) {
    const pegboardSpec = getSheet(config.pegboardMaterialId);
    if (pegboardSpec) {
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
  }

  // ======================================================================
  // Scale to bench count — pool every bench's pieces into one cut list so
  // the lumber and sheet packers can tile across benches jointly. Doing
  // this here (rather than at each cutList.push) keeps the per-bench
  // geometry code untouched.
  // ======================================================================
  if (config.benchCount > 1) {
    for (const item of cutList) item.qty *= config.benchCount;
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
  // Pack sheets
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
    const { layouts, oversize } = packSheets(inputs, spec.width, spec.height, config.kerf);
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
  // Shopping list (lumber rows + sheet rows)
  // ======================================================================
  const materialsLines: HardwareItem[] = [];
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
  // top aprons: 4 corners × 2 aprons per corner
  const apronJoints = 8;
  const stretcherJoints =
    (config.stretchers.floorStretchers ? 8 : 0) +
    (config.stretchers.centerStretcher ? 2 : 0);
  const shelfJoints = config.stretchers.lowerShelf && !config.stretchers.floorStretchers ? 8 : 0;

  const apronPerimeter = 2 * g.insideLongTop + 2 * g.insideShortTop;
  const topFastenPoints = Math.max(8, Math.ceil(apronPerimeter / 8));
  const doublerFastenPoints =
    config.topConstruction === "doubled-sheet"
      ? Math.ceil((config.topLength * config.topDepth) / (12 * 12))
      : 0;
  const shelfFastenPoints = config.stretchers.lowerShelf
    ? Math.max(6, Math.ceil(apronPerimeter / 10))
    : 0;
  const pegboardFastenPoints = config.pegboard
    ? Math.max(6, Math.ceil((config.topLength * config.pegboardHeight) / (12 * 12)))
    : 0;
  const diagonalBraceJoints =
    config.stretchers.diagonalBraces && !config.stretchers.floorStretchers ? 8 : 0;
  // Knockdown bolts: Nicholson-style needs ~16 (4 per end + 4 per apron).
  const knockdownBolts = config.knockdown ? 16 : 0;

  // Surface area for finish
  let surfaceArea = 0;
  surfaceArea += 2 * config.topLength * config.topDepth;
  surfaceArea += 2 * (config.topLength + config.topDepth) * g.topThickness;
  if (config.stretchers.lowerShelf) {
    surfaceArea += 2 * g.insideLongTop * g.insideShortTop;
  }
  surfaceArea += 4 * 4 * g.legCrossWidth * g.legCutLength;
  if (apron) {
    surfaceArea +=
      2 * (g.insideLongTop * 2 + g.insideShortTop * 2) * apron.actualDepth;
  }
  if (config.pegboard) {
    surfaceArea += 2 * config.topLength * config.pegboardHeight;
  }
  const surfaceSqFt = surfaceArea / 144;
  const perimeterFt = (2 * (config.topLength + config.topDepth)) / 12;

  const hardware = computeHardware(
    {
      // shimmed legacy shape — computeHardware uses these existing field names
      joinery: config.joinery,
      doubledTop: config.topConstruction === "doubled-sheet",
      casters: config.casters,
      edgeBand: config.edgeBand,
      finishCoats: config.finishCoats,
    } as never, // legacy compat with hardware.ts module
    {
      apronJoints,
      shelfJoints: shelfJoints + stretcherJoints,
      middleStretcherJoints: 0,
      topFastenPoints,
      shelfFastenPoints,
      pegboardFastenPoints,
      doublerFastenPoints,
      toolWellJoints: 0,
      diagonalBraceJoints,
      surfaceSqFt,
      perimeterFt,
    },
  );

  // Knockdown hardware addendum
  if (knockdownBolts > 0) {
    hardware.unshift(
      {
        qty: knockdownBolts,
        itemLabel: '3/8" x 16 cap screws (knockdown hardware)',
        note: "With ductile mounting plates on the inside face of the aprons",
        estimatedCost: knockdownBolts * 0.95,
      },
      {
        qty: knockdownBolts,
        itemLabel: '3/8" x 16 ductile mounting plates / threaded inserts',
        estimatedCost: knockdownBolts * 1.85,
      },
      {
        qty: knockdownBolts,
        itemLabel: '3/8" flat + lock washers',
        estimatedCost: knockdownBolts * 0.18,
      },
    );
  }

  // Vise hardware
  if (config.vise === "leg-vise") {
    hardware.push({
      qty: 1,
      itemLabel: 'Leg-vise screw + nut (wood or Acme threaded)',
      note: "Lake Erie Toolworks, Benchcrafted, or large all-thread + handle",
      estimatedCost: 95,
    });
  } else if (config.vise === "front-face-vise") {
    hardware.push({
      qty: 1,
      itemLabel: 'Front face vise (7" - 10" cast iron, e.g. Yost / Eclipse)',
      estimatedCost: 90,
    });
  } else if (config.vise === "tail-vise") {
    hardware.push({
      qty: 1,
      itemLabel: "Wagon-style tail-vise hardware (screw + dog)",
      estimatedCost: 140,
    });
  } else if (config.vise === "quick-release-9in") {
    hardware.push({
      qty: 1,
      itemLabel: 'Quick-release 9" woodworking vise',
      estimatedCost: 65,
    });
  } else if (config.vise === "pipe-clamp-vise") {
    hardware.push({
      qty: 1,
      itemLabel: 'Shop-built pipe-clamp vise (3/4" pipe + clamp head + jaw)',
      estimatedCost: 30,
    });
  }

  // Drawer hardware (metal slides; wooden runners are just shop-made strips)
  if (drawerGeo && drawerGeo.warnings.length === 0 && config.drawerCount > 0) {
    if (config.drawerSlideType === "metal") {
      // Pick a stocked slide length that doesn't exceed drawer depth.
      const stockedLengths = [10, 12, 14, 16, 18, 20, 22, 24];
      const slideLen =
        [...stockedLengths].reverse().find((L) => L <= drawerGeo.boxDepth) ??
        stockedLengths[0];
      hardware.push({
        qty: config.drawerCount,
        itemLabel: `${slideLen}" side-mount ball-bearing drawer slides (pair)`,
        note: "Full-extension, 100 lb class. Sold as pair (L + R) per drawer.",
        estimatedCost: config.drawerCount * 14,
      });
    } else {
      // Wooden runners — shop-made; just call out the wax & material.
      hardware.push({
        qty: 1,
        itemLabel: "Paraffin / canning wax block (for wooden drawer runners)",
        note: "Rub on runners and grooves before final assembly.",
        estimatedCost: 4,
      });
    }
    hardware.push({
      qty: config.drawerCount,
      itemLabel: "Drawer pull (knob or wire pull)",
      note: "Mount through false front into drawer front.",
      estimatedCost: config.drawerCount * 5,
    });
  }

  // Dog holes consumable: just a note line
  if (config.dogHoles) {
    const count = Math.max(
      4,
      Math.floor((config.topLength - 8) / config.dogHoleSpacing) + 1,
    );
    hardware.push({
      qty: count,
      itemLabel: '3/4" round bench dogs (or shop-made wooden)',
      note: `Bore 3/4" holes at ${config.dogHoleSpacing}" on center along the front edge of the top`,
      estimatedCost: count * 3.25,
    });
  }

  // Scale hardware to bench count. Tools intentionally NOT scaled — you don't
  // need a second drill to build a second bench.
  if (config.benchCount > 1) {
    for (const h of hardware) {
      h.qty *= config.benchCount;
      if (h.estimatedCost !== undefined) h.estimatedCost *= config.benchCount;
    }
  }

  // ======================================================================
  // Tools + steps
  // ======================================================================
  const tools = computeTools({
    joinery: config.joinery,
    doubledTop: config.topConstruction === "doubled-sheet",
    casters: config.casters,
    toolWell: config.toolWell,
    edgeBand: config.edgeBand,
    pegboard: config.pegboard,
  } as never);

  const steps = computeSteps({
    config,
    geometry: g,
  });

  // ======================================================================
  // Totals
  // ======================================================================
  const materialsCost =
    materialsLines.reduce((s, m) => s + (m.estimatedCost ?? 0), 0) +
    hardware.reduce((s, h) => s + (h.estimatedCost ?? 0), 0);

  let weightLb = 0;
  for (const b of lumberBoards) {
    const spec = getLumber(b.materialId)!;
    weightLb += b.stockLen * spec.actualWidth * spec.actualDepth * DENSITY_LUMBER;
  }
  for (const l of sheetLayouts) {
    const spec = getSheet(l.materialId)!;
    weightLb += spec.width * spec.height * spec.thickness * DENSITY_SHEET;
  }

  const combinedShopping: HardwareItem[] = [...materialsLines, ...hardware];
  const stability = assessStability(config);

  return {
    cutList,
    lumberBoards,
    sheetLayouts,
    hardware: combinedShopping,
    tools,
    steps,
    warnings,
    stability,
    derived: config,
    totals: {
      lumberFt,
      sheetSqFt,
      surfaceAreaSqFt: surfaceSqFt,
      estimatedCost: materialsCost > 0 ? materialsCost : undefined,
      weightLb,
    },
  };
}

function pushApron(
  cutList: CutListItem[],
  code: () => string,
  apron: LumberSpec,
  length: number,
  purpose: string,
) {
  cutList.push({
    partCode: code(),
    qty: 2,
    materialId: apron.id,
    materialLabel: apron.label,
    materialKind: "lumber",
    length,
    purpose,
  });
}

function formatFromFloor(inches: number) {
  return `${inches}" off floor`;
}

function apronJoineryDescription(config: BenchConfig): string {
  if (config.apronsOverlapLegs) return ", overlaps outside face of legs";
  if (config.joinery === "mortise" && config.tenonLength > 0) {
    return `, ${config.tenonLength}" tenon on each end (length includes tenons)`;
  }
  return ", inset between legs";
}

function stretcherJoineryDescription(config: BenchConfig): string {
  if (config.stretchersOverlapLegs) return ", overlaps outside face of legs";
  if (config.joinery === "mortise" && config.tenonLength > 0) {
    return `, ${config.tenonLength}" tenon on each end (length includes tenons)`;
  }
  return ", inset between legs";
}

function orientationDescription(o: BenchConfig["topLamOrientation"]): string {
  switch (o) {
    case "flat-edge":
      return "laid flat, edges glued";
    case "face-glue":
      return "face-glued";
    case "on-edge":
      return "standing on edge, edges glued";
  }
}

function errorResult(messages: string[], config: BenchConfig): CalcResult {
  return {
    cutList: [],
    lumberBoards: [],
    sheetLayouts: [],
    hardware: [],
    tools: [],
    steps: [],
    warnings: messages,
    stability: {
      verdict: "unstable",
      score: 0,
      topSagInches: 0,
      topSagLimitInches: 0,
      rackingResistanceLbf: 0,
      tipRatio: 0,
      baseWeightLb: 0,
      notes: [],
      warnings: messages,
    },
    derived: config,
    totals: { lumberFt: 0, sheetSqFt: 0, surfaceAreaSqFt: 0, weightLb: 0 },
  };
}

export type { BenchConfig, CalcResult, CutListItem } from "./types";
