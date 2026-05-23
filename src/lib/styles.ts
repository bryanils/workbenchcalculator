// Style profiles encode real-world bench designs. Picking a style + L/D/H
// derives every other structural choice (joinery, stretcher layout, top
// construction, vise, etc.) so the resulting bench is structurally sound
// instead of a generic 4-leg-and-apron sketch.
//
// References: Christopher Schwarz Knockdown Nicholson (Lost Art Press),
// Benchcrafted Split-Top Roubo, Will Myers Moravian (Wood and Shop),
// FamilyHandyman 2x4 garage workbench, Woodshop Diaries mobile cart.

import type { Joinery } from "./types";

export type BenchStyleId =
  | "heavy-garage"
  | "knockdown-nicholson"
  | "split-top-roubo"
  | "moravian-knockdown"
  | "garage-2x4-basics"
  | "mobile-assembly-cart"
  | "kid-bench";

// How the base comes apart (or doesn't):
// - "bolted":    metal cap screws into ductile mounting plates (Schwarz Nicholson)
// - "wedged":    hardwood wedges through tusk tenons, no metal (Moravian)
// - "barrel-nut": cross-dowel barrel nuts pulled by hex bolts (Benchcrafted Roubo long rails)
export type KnockdownHardwareKind = "bolted" | "wedged" | "barrel-nut";

export type TopConstruction =
  | "single-sheet" // one sheet of ply / MDF
  | "doubled-sheet" // two layers laminated
  | "laminated-2x" // dimensional lumber on edge (Roubo, Nicholson)
  | "slab"; // single thick hardwood slab

export type ViseKind =
  | "none"
  | "front-face-vise" // 7" - 10" cast-iron face vise on left front
  | "leg-vise" // Roubo / hand-tool style, integral with front leg
  | "tail-vise" // wagon or end vise
  | "quick-release-9in" // budget Jorgensen-style
  | "pipe-clamp-vise"; // shop-built for utility benches

export type StretcherLayout = {
  // "floor stretcher box": low horizontal rails connecting legs near floor.
  // This is the single biggest racking-resistance feature on a real bench.
  floorStretchers: boolean;
  floorStretcherHeight: number; // inches above floor (top of stretcher)
  // Optional mid-rail running L/R between long aprons under top:
  centerStretcher: boolean;
  // Lower shelf as a sheet sitting on rails (separate from floor stretchers):
  lowerShelf: boolean;
  shelfHeight: number; // inches above floor
  // Diagonal corner braces (only for cart-type benches that lack stretchers):
  diagonalBraces: boolean;
};

// How dimensional lumber gets glued up into the top:
// - "flat-edge": boards lie flat, narrow edges glued (Nicholson: 2× 2x12 → 22.5"W × 1.5"T)
// - "face-glue": boards stacked face-to-face (built-up beams)
// - "on-edge":  boards stand on edge, narrow edges glued (Roubo/Moravian: N× 2x6 → wide thick slab)
export type TopLamOrientation = "flat-edge" | "face-glue" | "on-edge";

// Drawer location relative to the bench frame:
// - "under-top":   a horizontal row of N drawers hanging from under the top,
//                  between the front and back aprons. Height = apron face dim.
// - "below-shelf": a vertical column of N drawers at one end of the bench,
//                  from the lower shelf up to the underside of the top.
export type DrawerLocation = "under-top" | "below-shelf";

// Slide clearance per side eaten by the hardware:
// - "metal":  modern ball-bearing slides → 1/2" each side, 1" total
// - "wooden": shop-made grooved runner   → 3/8" each side, 3/4" total
export type DrawerSlideType = "metal" | "wooden";

export type StyleProfile = {
  id: BenchStyleId;
  name: string;
  blurb: string;
  // What the style is good at, in plain words:
  useCase: string;
  // Defaults shown when you switch into the style:
  defaultLength: number;
  defaultDepth: number;
  defaultHeight: number;
  // Min/max realistic dimensions:
  lengthRange: [number, number];
  depthRange: [number, number];
  heightRange: [number, number];
  // Derived structural choices (legs/aprons/top/stretchers):
  legMaterialId: string; // e.g. "4x4" or built-up laminated 4x4
  apronMaterialId: string; // top-apron lumber
  stretcherMaterialId: string; // floor stretcher lumber
  topConstruction: TopConstruction;
  topMaterialId: string; // sheet id for single/doubled, or lumber id used to laminate
  topLamCount?: number; // for laminated-2x with flat-edge / face-glue. on-edge auto-derives from topDepth.
  topLamOrientation?: TopLamOrientation; // required when topConstruction === "laminated-2x"
  topSlabThickness?: number; // for "slab": thickness in inches
  // How far the top hangs past the legs on every side:
  overhangFront: number;
  overhangSide: number;
  // Stretcher / shelf layout:
  stretchers: StretcherLayout;
  // Splay (Moravian) — angle in degrees off vertical, viewed from the end:
  legSplayDeg: number;
  // Knockdown bolts vs glue-up:
  knockdown: boolean;
  // What kind of knockdown hardware (only consulted when knockdown===true OR
  // the style ships with a barrel-nut kit even if it isn't fully knockdown).
  knockdownHardwareKind?: KnockdownHardwareKind;
  // Defaults for the rest of the form (user can override in advanced):
  joinery: Joinery;
  // True for Nicholson / 2x4 carriage-bolt benches where the apron runs
  // PAST the outside face of the leg posts (not inset between them).
  apronsOverlapLegs?: boolean;
  // Same idea for floor stretchers (2x4 carriage-bolt benches).
  stretchersOverlapLegs?: boolean;
  // Mortise-and-tenon tenon length (inches) added to each end of any inset
  // apron/stretcher. Ignored when joinery !== "mortise" or when the part
  // overlaps the leg instead of fitting between them.
  tenonLength?: number;
  vise: ViseKind;
  dogHoles: boolean;
  dogHoleSpacing: number; // inches between dog hole centers along front edge
  casters: boolean; // baseline — user can still toggle
  // Drawer defaults (0 = no drawers by default). User can always override.
  defaultDrawerCount?: number;
  defaultDrawerLocation?: DrawerLocation;
  defaultDrawerSlideType?: DrawerSlideType;
  // Notes shown next to the design (used in build sheet header):
  designNotes: string[];
};

// ----------------------------------------------------------------------
// The style catalog
// ----------------------------------------------------------------------

export const STYLE_PROFILES: StyleProfile[] = [
  {
    id: "heavy-garage",
    name: "Heavy-Duty Garage Workhorse",
    blurb:
      'Stationary 4x4-post bench with full floor-stretcher box, 2x6 aprons, doubled 3/4" plywood top. Handles a vise, a vehicle wheel, or a press.',
    useCase: "Daily-driver shop bench. Wrenching, hand tools, light pounding.",
    defaultLength: 72,
    defaultDepth: 30,
    defaultHeight: 34,
    lengthRange: [48, 96],
    depthRange: [24, 36],
    heightRange: [32, 38],
    legMaterialId: "4x4",
    apronMaterialId: "2x6",
    stretcherMaterialId: "2x6",
    topConstruction: "doubled-sheet",
    topMaterialId: "ply_3_4",
    overhangFront: 1,
    overhangSide: 1,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 6,
      centerStretcher: true,
      lowerShelf: true,
      shelfHeight: 10,
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: false,
    joinery: "lag",
    vise: "front-face-vise",
    dogHoles: false,
    dogHoleSpacing: 6,
    casters: false,
    defaultDrawerCount: 2,
    defaultDrawerLocation: "under-top",
    defaultDrawerSlideType: "metal",
    designNotes: [
      'Doubled 3/4" plywood top gives a 1-1/2" working surface that absorbs hammering.',
      "Floor stretchers at 6\" off the floor are the primary anti-racking element — they turn the base into a torsion box.",
      "Center stretcher under the top prevents long-span sag.",
    ],
  },
  {
    id: "knockdown-nicholson",
    name: "Knockdown Nicholson (Schwarz)",
    blurb:
      "Christopher Schwarz / Lost Art Press knockdown English bench. Five subassemblies bolted together. 2x12 aprons act as the structural beams.",
    useCase:
      "Apartment / movable workshop. Disassembles with a 9/16\" ratchet in under 10 minutes.",
    defaultLength: 72,
    defaultDepth: 22,
    defaultHeight: 33,
    lengthRange: [60, 96],
    depthRange: [20, 26],
    heightRange: [32, 36],
    legMaterialId: "4x4",
    apronMaterialId: "2x12",
    stretcherMaterialId: "2x6",
    topConstruction: "laminated-2x",
    topMaterialId: "2x12",
    topLamCount: 2, // top is two 2x12s glued edge-to-edge → ~22-1/2" wide
    topLamOrientation: "flat-edge",
    overhangFront: 0,
    overhangSide: 1,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 8,
      centerStretcher: false,
      lowerShelf: false,
      shelfHeight: 0,
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: true,
    knockdownHardwareKind: "bolted",
    joinery: "lag", // 3/8"-16 cap screws into ductile plates — modeled as lag joinery
    apronsOverlapLegs: true,
    stretchersOverlapLegs: true,
    vise: "leg-vise",
    dogHoles: true,
    dogHoleSpacing: 6,
    casters: false,
    designNotes: [
      "Top is two 2x12s glued edge-to-edge — the only panel glue-up. Everything else is bolted.",
      "Tall 2x12 aprons ARE the structure: they resist sag along the long axis without needing a center stretcher.",
      'Knockdown joinery uses 3/8" x 16 threaded rod with ductile mounting plates — modeled here as 3/8" lag bolts.',
    ],
  },
  {
    id: "split-top-roubo",
    name: "Split-Top Roubo (Hand-Tool Bench)",
    blurb:
      'Laminated 4" hardwood top, massive 3-1/2" thick legs, through-tenoned to the top. Designed for planing, mortising, dovetailing.',
    useCase: "Serious hand-tool woodworking. Heavy enough to plane on without skating.",
    defaultLength: 84,
    defaultDepth: 24,
    defaultHeight: 34,
    lengthRange: [60, 96],
    depthRange: [22, 28],
    heightRange: [32, 36],
    legMaterialId: "4x4", // would be hardwood — represented as 4x4 cross-section
    apronMaterialId: "2x6",
    stretcherMaterialId: "2x6",
    topConstruction: "slab",
    topMaterialId: "2x12", // notional, since slabs are typically built from 8/4 hardwood
    topSlabThickness: 4,
    overhangFront: 0,
    overhangSide: 2,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 8,
      centerStretcher: false,
      lowerShelf: false,
      shelfHeight: 0,
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: false,
    // Benchcrafted Split-Top Roubo: long rails are knockdown via barrel nuts;
    // short rails are permanent drawbored M&T. We surface the barrel-nut kit
    // even though `knockdown` is false because the parts list still needs it.
    knockdownHardwareKind: "barrel-nut",
    joinery: "mortise",
    tenonLength: 1.5, // 1-1/2" wedged through-tenons typical for Roubo
    vise: "leg-vise",
    dogHoles: true,
    dogHoleSpacing: 4,
    casters: false,
    designNotes: [
      '4"-thick laminated slab top is the heart of the design — every leg is through-tenoned into it.',
      "Floor stretchers are deep (2x6) and wedged or drawbored — no movement under the heaviest planing.",
      "No overhang along the front so a workpiece can be clamped against the front edge for full support.",
    ],
  },
  {
    id: "moravian-knockdown",
    name: "Moravian Knockdown Bench",
    blurb:
      "Will Myers's splayed-leg knockdown bench. Legs splay outward at ~16°. Wedged through-tenons. Breaks down for transport in minutes.",
    useCase: "Portable / travel bench. Footprint is wider than the top for stability.",
    defaultLength: 60,
    defaultDepth: 22,
    defaultHeight: 34,
    lengthRange: [48, 72],
    depthRange: [20, 24],
    heightRange: [32, 36],
    legMaterialId: "4x4",
    apronMaterialId: "2x6",
    stretcherMaterialId: "2x6",
    topConstruction: "laminated-2x",
    topMaterialId: "2x6",
    // On-edge: 2x6s stand on edge, narrow edges glued. lamCount auto-derives
    // from topDepth at calculate time (≈ topDepth / 1.5"). Yields a 5-1/2"
    // thick slab (the actualDepth of a 2x6).
    topLamOrientation: "on-edge",
    overhangFront: 1,
    overhangSide: 4, // the legs sit well in from the ends
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 7,
      centerStretcher: false,
      lowerShelf: false,
      shelfHeight: 0,
      diagonalBraces: false,
    },
    legSplayDeg: 16,
    knockdown: true,
    knockdownHardwareKind: "wedged",
    joinery: "mortise",
    tenonLength: 1.5, // wedged through-tenons / tusk tenons
    vise: "leg-vise",
    dogHoles: true,
    dogHoleSpacing: 6,
    casters: false,
    designNotes: [
      "Legs splay 16° outward — footprint at the floor is wider than the top, which dramatically improves tipping resistance.",
      "All joints are wedged through-tenons or tusk tenons — no fasteners. Knocks apart with a mallet.",
      "Carry weight: under 100 lb because everything ships flat.",
    ],
  },
  {
    id: "garage-2x4-basics",
    name: "2x4 Basics Garage Bench",
    blurb:
      "The classic budget bench: 2x4 frame with overlapped stretchers bolted with carriage bolts. Lower shelf adds load capacity and racking resistance.",
    useCase: "First-bench / budget build. Four hours and under $100 in lumber.",
    defaultLength: 60,
    defaultDepth: 24,
    defaultHeight: 34,
    lengthRange: [48, 72],
    depthRange: [20, 30],
    heightRange: [30, 38],
    legMaterialId: "2x4",
    apronMaterialId: "2x4",
    stretcherMaterialId: "2x4",
    topConstruction: "doubled-sheet",
    topMaterialId: "ply_3_4",
    overhangFront: 1,
    overhangSide: 1,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 4, // overlap-bolted near floor
      centerStretcher: false,
      lowerShelf: true,
      shelfHeight: 8, // shelf sits on the floor stretchers
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: false,
    joinery: "lag", // 3/8" carriage bolts — modeled as lag bolts
    apronsOverlapLegs: true,
    stretchersOverlapLegs: true,
    vise: "none",
    dogHoles: false,
    dogHoleSpacing: 6,
    casters: false,
    designNotes: [
      "Legs are built from doubled 2x4s on outside corners with stretchers overlapping the legs (not butting into them) — that overlap is what makes the joint racking-resistant on cheap stock.",
      "Lower shelf sits on the floor stretchers and stiffens the whole base.",
      'Pro tip from the original plan: keep distance between outside faces of legs at exactly 16-1/2" so two 2x4 ends fit cleanly across the leg pair.',
    ],
  },
  {
    id: "mobile-assembly-cart",
    name: "Mobile Assembly Cart",
    blurb:
      "Rolling assembly table. 4x4 corner posts, full lower stretcher box, mid stretchers, doubled 3/4\" top, 4\" locking HD casters.",
    useCase: "Glue-up / assembly / outfeed station you can roll out of the way.",
    defaultLength: 60,
    defaultDepth: 28,
    defaultHeight: 36, // top with casters; 32" without
    lengthRange: [36, 72],
    depthRange: [24, 36],
    heightRange: [32, 40],
    legMaterialId: "4x4",
    apronMaterialId: "2x4",
    stretcherMaterialId: "2x4",
    topConstruction: "doubled-sheet",
    topMaterialId: "ply_3_4",
    overhangFront: 0.5,
    overhangSide: 0.5,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 5, // just above caster top plates
      centerStretcher: true,
      lowerShelf: true,
      shelfHeight: 9,
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: false,
    joinery: "pocket",
    vise: "none",
    dogHoles: false,
    dogHoleSpacing: 6,
    casters: true,
    defaultDrawerCount: 3,
    defaultDrawerLocation: "below-shelf",
    defaultDrawerSlideType: "metal",
    designNotes: [
      "4x4 corner posts are critical — 2x4 posts on a mobile bench will rack and the casters will splay outward over time.",
      'Caster height (~3-1/2") is included in total height — the leg cut shortens accordingly.',
      "Floor stretchers are mandatory on a rolling bench: they prevent the base from parallelogramming when you push it.",
    ],
  },
  {
    id: "kid-bench",
    name: "Kid-Sized Workbench",
    blurb:
      'Proper proportions scaled to a 24" working height. Full floor stretcher box and lower shelf — built like a real bench, just shorter.',
    useCase: "Kid's first bench. Same structural rules as adult bench, scaled down.",
    defaultLength: 36,
    defaultDepth: 18,
    defaultHeight: 24,
    lengthRange: [30, 48],
    depthRange: [16, 22],
    heightRange: [20, 28],
    legMaterialId: "2x4",
    apronMaterialId: "2x4",
    stretcherMaterialId: "2x4",
    topConstruction: "single-sheet",
    topMaterialId: "ply_3_4",
    overhangFront: 1,
    overhangSide: 1,
    stretchers: {
      floorStretchers: true,
      floorStretcherHeight: 4,
      centerStretcher: false,
      lowerShelf: true,
      shelfHeight: 7,
      diagonalBraces: false,
    },
    legSplayDeg: 0,
    knockdown: false,
    joinery: "pocket",
    vise: "none",
    dogHoles: false,
    dogHoleSpacing: 6,
    casters: false,
    defaultDrawerCount: 1,
    defaultDrawerLocation: "under-top",
    defaultDrawerSlideType: "metal",
    designNotes: [
      "Floor stretchers and shelf are non-negotiable on a small bench — short benches racked badly without them.",
      "All edges should be eased with a 1/8\" roundover before finishing.",
    ],
  },
];

export function getStyle(id: string): StyleProfile | undefined {
  return STYLE_PROFILES.find((s) => s.id === id);
}

export const DEFAULT_STYLE_ID: BenchStyleId = "heavy-garage";
