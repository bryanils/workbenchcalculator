import type { BenchConfig, HardwareItem } from "./types";
import { CONSUMABLES, getScrew } from "./materials";

type Counts = {
  apronJoints: number;      // 4 corners × (apron count per corner)
  shelfJoints: number;
  middleStretcherJoints: number;
  topFastenPoints: number;
  shelfFastenPoints: number;
  pegboardFastenPoints: number;
  doublerFastenPoints: number;
  toolWellJoints: number;
  diagonalBraceJoints: number;
  surfaceSqFt: number;       // total finished surface (all faces)
  perimeterFt: number;       // for edge banding of top
};

export function computeHardware(
  config: BenchConfig,
  counts: Counts,
): HardwareItem[] {
  const items: HardwareItem[] = [];
  const join = config.joinery;

  // ----- Joinery hardware -----
  if (join === "pocket") {
    const pocketsPerApron = 2;
    const pocketsPerStretcher = 2;
    const total =
      counts.apronJoints * pocketsPerApron +
      counts.shelfJoints * pocketsPerApron +
      counts.middleStretcherJoints * pocketsPerStretcher +
      counts.diagonalBraceJoints * 2;
    pushScrew(items, "pocket_2_1_2", total, "Apron / shelf rail joints to legs");
  } else if (join === "lag") {
    const lagsPerJoint = 2;
    const total =
      (counts.apronJoints + counts.shelfJoints + counts.middleStretcherJoints) *
      lagsPerJoint;
    items.push({
      qty: total,
      itemLabel: 'Lag bolts 3/8" x 4"',
      note: "With 3/8 washers — counter-bore the leg face",
      estimatedCost: total * (getScrew("lag_3_8x4")?.pricePerEa ?? 0.85),
    });
    items.push({
      qty: total,
      itemLabel: '3/8" flat washers',
      estimatedCost: total * 0.08,
    });
  } else {
    // mortise & tenon — no metal fasteners, just glue + optional pegs
    const pegs = counts.apronJoints * 2 + counts.shelfJoints * 2;
    items.push({
      qty: pegs,
      itemLabel: '3/8" x 2" wooden dowels (draw-bore pegs)',
      note: "Optional but recommended for draw-boring M&T joints",
      estimatedCost: pegs * 0.18,
    });
  }

  // ----- Top attachment -----
  pushScrew(
    items,
    "wood_1_1_4",
    counts.topFastenPoints,
    "Top to aprons (countersunk from below)",
  );

  // ----- Doubled top -----
  if (config.topSheetLayers === 2 && counts.doublerFastenPoints > 0) {
    pushScrew(
      items,
      "wood_1_1_4",
      counts.doublerFastenPoints,
      "Second top sheet to first (glued + screwed)",
    );
  }

  // ----- Shelf -----
  if (counts.shelfFastenPoints > 0) {
    pushScrew(
      items,
      "wood_1_1_4",
      counts.shelfFastenPoints,
      "Shelf to lower stretchers",
    );
  }

  // ----- Pegboard -----
  if (counts.pegboardFastenPoints > 0) {
    pushScrew(
      items,
      "wood_1_1_4",
      counts.pegboardFastenPoints,
      "Pegboard to back, with 1/2 spacers",
    );
    items.push({
      qty: counts.pegboardFastenPoints,
      itemLabel: '1/2" nylon spacers',
      note: "Hold pegboard off back to allow hook insertion",
      estimatedCost: counts.pegboardFastenPoints * 0.20,
    });
  }

  // ----- Tool well -----
  if (counts.toolWellJoints > 0) {
    pushScrew(items, "wood_2", counts.toolWellJoints, "Tool-well frame screws");
  }

  // ----- Casters -----
  if (config.casters) {
    items.push({
      qty: 4,
      itemLabel: CONSUMABLES.caster.label,
      note: "Locking with brake; 4 corners",
      estimatedCost: 4 * CONSUMABLES.caster.pricePerUnit,
    });
    pushScrew(items, "caster_screw", 16, "Caster plates (4 screws per plate)");
  }

  // ----- Consumables -----
  // Glue: ~0.5 oz per joint
  const glueJoints =
    counts.apronJoints +
    counts.shelfJoints +
    counts.middleStretcherJoints +
    counts.toolWellJoints +
    counts.diagonalBraceJoints +
    (config.topSheetLayers === 2 ? 4 : 0);
  const glueOz = Math.max(2, Math.ceil(glueJoints * 0.5));
  items.push({
    qty: glueOz,
    itemLabel: CONSUMABLES.wood_glue_oz.label,
    unit: CONSUMABLES.wood_glue_oz.unit,
    note: `~0.5 oz per joint × ${glueJoints} joints`,
    estimatedCost: glueOz * CONSUMABLES.wood_glue_oz.pricePerUnit,
  });

  // Finish: ~1 oz per 4 sq ft per coat
  const finishOz = Math.ceil(
    (counts.surfaceSqFt / 4) * Math.max(1, config.finishCoats),
  );
  if (finishOz > 0) {
    items.push({
      qty: finishOz,
      itemLabel: CONSUMABLES.finish_oz.label,
      unit: CONSUMABLES.finish_oz.unit,
      note: `${counts.surfaceSqFt.toFixed(0)} sq ft × ${config.finishCoats} coat(s)`,
      estimatedCost: finishOz * CONSUMABLES.finish_oz.pricePerUnit,
    });
  }

  // Sandpaper — one set of 80/120/220 per ~12 sq ft
  const sandpaperSets = Math.max(1, Math.ceil(counts.surfaceSqFt / 12));
  items.push({
    qty: sandpaperSets * 3,
    itemLabel: "Sandpaper (80, 120, 220 grit)",
    unit: CONSUMABLES.sandpaper.unit,
    note: `${sandpaperSets} set(s) of 3 grits`,
    estimatedCost: sandpaperSets * 3 * CONSUMABLES.sandpaper.pricePerUnit,
  });

  // Edge banding for top (perimeter, if plywood + opted in)
  if (config.edgeBand && counts.perimeterFt > 0) {
    const ft = Math.ceil(counts.perimeterFt * (config.topSheetLayers === 2 ? 2 : 1) + 2);
    items.push({
      qty: ft,
      itemLabel: CONSUMABLES.edge_band_ft.label,
      unit: CONSUMABLES.edge_band_ft.unit,
      note: "Iron-on; covers exposed plywood edges",
      estimatedCost: ft * CONSUMABLES.edge_band_ft.pricePerUnit,
    });
  }

  return items;
}

function pushScrew(items: HardwareItem[], id: string, qty: number, note: string) {
  if (qty <= 0) return;
  const spec = getScrew(id);
  if (!spec) return;
  items.push({
    qty,
    itemLabel: spec.label,
    note,
    estimatedCost: spec.pricePerEa ? qty * spec.pricePerEa : undefined,
  });
}
