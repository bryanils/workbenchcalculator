// All internal dimensions are in INCHES. UI converts at the edges.
// Actual (dressed) lumber dimensions per US softwood standard.

export type LumberSpec = {
  id: string;
  label: string;
  actualWidth: number; // thinner face (in)
  actualDepth: number; // wider face (in)
  stockLengths: number[]; // inches
  pricePerFt?: number;
};

export type SheetSpec = {
  id: string;
  label: string;
  width: number; // inches
  height: number; // inches
  thickness: number; // inches
  pricePerSheet?: number;
};

export type ScrewSpec = {
  id: string;
  label: string;
  lengthIn: number;
  use: string;
  pricePerEa?: number;
};

const LUMBER_2X_LENGTHS = [96, 120, 144, 168, 192];
const LUMBER_4X_LENGTHS = [96, 120, 144];

// Nominal 4x8 sheet goods are usually shipped slightly oversized so clean
// factory edges can be trimmed while still yielding nominal cuts after kerf.
export const SHEET_PACKING_EXTRA_IN = 0.8;

export const LUMBER: LumberSpec[] = [
  { id: "2x4",  label: "2x4",  actualWidth: 1.5, actualDepth: 3.5,   stockLengths: LUMBER_2X_LENGTHS, pricePerFt: 0.95 },
  { id: "2x6",  label: "2x6",  actualWidth: 1.5, actualDepth: 5.5,   stockLengths: LUMBER_2X_LENGTHS, pricePerFt: 1.50 },
  { id: "2x8",  label: "2x8",  actualWidth: 1.5, actualDepth: 7.25,  stockLengths: LUMBER_2X_LENGTHS, pricePerFt: 2.10 },
  { id: "2x10", label: "2x10", actualWidth: 1.5, actualDepth: 9.25,  stockLengths: LUMBER_2X_LENGTHS, pricePerFt: 2.80 },
  { id: "2x12", label: "2x12", actualWidth: 1.5, actualDepth: 11.25, stockLengths: LUMBER_2X_LENGTHS, pricePerFt: 3.60 },
  { id: "4x4",  label: "4x4",  actualWidth: 3.5, actualDepth: 3.5,   stockLengths: LUMBER_4X_LENGTHS, pricePerFt: 2.50 },
  { id: "4x6",  label: "4x6",  actualWidth: 3.5, actualDepth: 5.5,   stockLengths: LUMBER_4X_LENGTHS, pricePerFt: 4.50 },
  { id: "6x6",  label: "6x6",  actualWidth: 5.5, actualDepth: 5.5,   stockLengths: LUMBER_4X_LENGTHS, pricePerFt: 8.00 },
];

export const SHEETS: SheetSpec[] = [
  { id: "ply_3_4",  label: 'Plywood 3/4"',  width: 48, height: 96, thickness: 0.75,   pricePerSheet: 65 },
  { id: "ply_1_2",  label: 'Plywood 1/2"',  width: 48, height: 96, thickness: 0.5,    pricePerSheet: 48 },
  { id: "ply_1_4",  label: 'Plywood 1/4"',  width: 48, height: 96, thickness: 0.25,   pricePerSheet: 30 },
  { id: "mdf_3_4",  label: 'MDF 3/4"',      width: 48, height: 96, thickness: 0.75,   pricePerSheet: 45 },
  { id: "mdf_1_2",  label: 'MDF 1/2"',      width: 48, height: 96, thickness: 0.5,    pricePerSheet: 32 },
  { id: "osb_7_16", label: 'OSB 7/16"',     width: 48, height: 96, thickness: 0.4375, pricePerSheet: 22 },
  { id: "osb_3_4",  label: 'OSB 3/4"',      width: 48, height: 96, thickness: 0.75,   pricePerSheet: 35 },
  { id: "hdb_1_4",  label: 'Hardboard 1/4"', width: 48, height: 96, thickness: 0.25,  pricePerSheet: 18 },
];

// Prices verified May 2026 against Home Depot (Everbilt / DECKMATE / Kreg /
// SPAX) bulk-pack listings; per-piece = pack price ÷ pack qty. Where Home
// Depot didn't stock the exact size, a substitute is used and noted.
export const SCREWS: ScrewSpec[] = [
  { id: "pocket_1_1_4", label: 'Pocket screws 1-1/4"', lengthIn: 1.25, use: "Pocket holes into 3/4 stock", pricePerEa: 0.17 },
  { id: "pocket_2_1_2", label: 'Pocket screws 2-1/2"', lengthIn: 2.5,  use: "Pocket holes into 1-1/2 stock (aprons → legs)", pricePerEa: 0.17 },
  { id: "wood_1_1_4",   label: 'Wood screws #8 x 1-1/4"', lengthIn: 1.25, use: "Top/shelf to apron, pegboard mount", pricePerEa: 0.065 },
  { id: "wood_2",       label: 'Wood screws #8 x 2"',     lengthIn: 2,    use: "Top doubler, general assembly", pricePerEa: 0.10 },
  { id: "wood_2_1_2",   label: 'Wood screws #10 x 2-1/2"', lengthIn: 2.5, use: "Apron-to-leg (face screw alternative)", pricePerEa: 0.12 },
  { id: "wood_3",       label: 'Wood screws #10 x 3"',    lengthIn: 3,    use: "Heavy connections through 2x stock", pricePerEa: 0.15 },
  // Everbilt 801580, $19.58 / 25-pack = $0.78/ea.
  { id: "lag_3_8x4",    label: 'Lag bolts 3/8" x 4"',     lengthIn: 4,    use: "Heavy-duty apron-to-leg lag joints (inset)", pricePerEa: 0.78 },
  // Everbilt 800270, $21.96 / 25-pack = $0.88/ea.
  { id: "carriage_3_8x3_1_2", label: 'Carriage bolts 3/8" x 3-1/2"', lengthIn: 3.5, use: "Through-bolt overlapping 2x aprons → legs (FamilyHandyman 2x4 bench)", pricePerEa: 0.88 },
  // Home Depot doesn't stock 3/8"-16 x 2-1/2" Grade 5 as a separate SKU;
  // closest in-stock equivalent is Everbilt 800850 hex bolt zinc, ~$0.55/ea.
  // Grade-8 cap screw at the same length runs ~$3.75 each (single-pack).
  { id: "cap_3_8x16x2_1_2", label: 'Hex-head cap screws 3/8"-16 x 2-1/2"', lengthIn: 2.5, use: "Schwarz Knockdown Nicholson — drive into ductile mounting plate", pricePerEa: 0.85 },
  // SPAX PowerLags 12-pack (Home Depot 315306136), ~$15.50 / 12 = $1.30/ea.
  { id: "spax_5",       label: 'Spax HD 1/4" x 5" lag screws', lengthIn: 5, use: "Benchcrafted Roubo — secure top slab to leg through-tenons", pricePerEa: 1.30 },
  // Everbilt 801322 #12 x 1-1/2", $15.93 / 50-pack = $0.32/ea.
  { id: "caster_screw", label: "Caster mount #12 x 1-1/2\"", lengthIn: 1.5, use: "Fasten caster plates to bottom of legs", pricePerEa: 0.32 },
];

export function getLumber(id: string) { return LUMBER.find((l) => l.id === id); }
export function getSheet(id: string) { return SHEETS.find((s) => s.id === id); }
export function getScrew(id: string) { return SCREWS.find((s) => s.id === id); }

// Consumables priced per unit. Per-unit prices derived from current Home
// Depot / Lowe's listings (verified May 2026):
// - Titebond II 16 oz bottle, $8.49 → $0.53/oz
// - Minwax Fast-Drying Polyurethane 32 oz quart, ~$20 → $0.63/oz
// - 3M Pro Grade 9x11 assorted-grit sandpaper 6-pack, ~$8 → $1.30/sheet
// - Everbilt 4120745EB 4" red poly locking swivel plate caster (250 lb), $16.97/ea
//   (the 300 lb Shepherd 3760 is currently OOS at Home Depot; the 250 lb
//   Everbilt is the realistic in-stock spec)
// - Edgemate 657608 13/16" birch iron-on edge tape 25 ft, $8.32 → $0.33/ft
export const CONSUMABLES = {
  wood_glue_oz: { label: "Wood glue (Titebond II)", unit: "fl oz", pricePerUnit: 0.53 },
  finish_oz:    { label: "Polyurethane finish (Minwax Fast-Drying)", unit: "fl oz", pricePerUnit: 0.63 },
  sandpaper:    { label: "Sandpaper sheet (9x11, mixed grit)", unit: "sheet", pricePerUnit: 1.30 },
  caster:       { label: 'Locking caster 4" plate (250 lb rated)', unit: "ea", pricePerUnit: 16.97 },
  edge_band_ft: { label: 'Iron-on edge banding 13/16"', unit: "ft", pricePerUnit: 0.33 },
} as const;
