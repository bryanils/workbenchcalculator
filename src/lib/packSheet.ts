// Shelf-based 2D bin-pack for sheet goods.
// Each cut is placed on a horizontal shelf; new shelf when no room.
// Pieces are rotated to fit landscape if helpful.

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

export function packSheets(
  cutsRaw: SheetCutInput[],
  sheetW: number,
  sheetH: number,
  kerf: number,
): { layouts: SheetLayout[]; oversize: SheetCutInput[] } {
  // Normalize the sheet to landscape (long dim = SW). Pieces are normalized to
  // landscape too, so both ends of the comparison live in the same orientation
  // and a 72"×30" cut isn't falsely rejected from a 48"×96" sheet.
  const SW = Math.max(sheetW, sheetH);
  const SH = Math.min(sheetW, sheetH);

  const cuts = [...cutsRaw]
    .map((c) => {
      const w = Math.max(c.w, c.h);
      const h = Math.min(c.w, c.h);
      const rotated = w !== c.w;
      return { w, h, partCode: c.partCode, purpose: c.purpose, rotated };
    })
    .sort((a, b) => b.h - a.h || b.w - a.w);

  const oversize: SheetCutInput[] = [];
  const layouts: SheetLayout[] = [];

  for (const cut of cuts) {
    if (cut.w > SW || cut.h > SH) {
      oversize.push({ w: cut.w, h: cut.h, partCode: cut.partCode, purpose: cut.purpose });
      continue;
    }
    placeOnSheets(cut, SW, SH, kerf, layouts);
  }

  for (const l of layouts) {
    l.usedArea = l.pieces.reduce((s, p) => s + p.w * p.h, 0);
  }

  return { layouts, oversize };
}

type ShelfState = {
  yBase: number;
  height: number;
  cursorX: number;
};

function placeOnSheets(
  cut: { w: number; h: number; partCode: string; purpose: string; rotated: boolean },
  sheetW: number,
  sheetH: number,
  kerf: number,
  layouts: (SheetLayout & { _shelves?: ShelfState[] })[],
) {
  for (const layout of layouts) {
    const shelves = layout._shelves ?? [];
    // Try existing shelves
    for (const shelf of shelves) {
      const kx = shelf.cursorX > 0 ? kerf : 0;
      if (shelf.cursorX + kx + cut.w <= sheetW && cut.h <= shelf.height) {
        const x = shelf.cursorX + kx;
        layout.pieces.push({
          x, y: shelf.yBase, w: cut.w, h: cut.h,
          partCode: cut.partCode, purpose: cut.purpose, rotated: cut.rotated,
        });
        shelf.cursorX = x + cut.w;
        return;
      }
    }
    // New shelf on this sheet
    const used = shelves.reduce((s, sh) => s + sh.height, 0);
    const ky = used > 0 ? kerf : 0;
    if (used + ky + cut.h <= sheetH && cut.w <= sheetW) {
      const yBase = used + ky;
      layout.pieces.push({
        x: 0, y: yBase, w: cut.w, h: cut.h,
        partCode: cut.partCode, purpose: cut.purpose, rotated: cut.rotated,
      });
      shelves.push({ yBase, height: cut.h, cursorX: cut.w });
      layout._shelves = shelves;
      return;
    }
  }
  // New sheet entirely
  const layout: SheetLayout & { _shelves: ShelfState[] } = {
    sheetW, sheetH, pieces: [], usedArea: 0,
    _shelves: [{ yBase: 0, height: cut.h, cursorX: cut.w }],
  };
  layout.pieces.push({
    x: 0, y: 0, w: cut.w, h: cut.h,
    partCode: cut.partCode, purpose: cut.purpose, rotated: cut.rotated,
  });
  layouts.push(layout);
}
