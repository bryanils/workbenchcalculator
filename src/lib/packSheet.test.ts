import { describe, expect, test } from "bun:test";
import { packSheets, type SheetCutInput, type PlacedPiece } from "./packSheet";

function cut(w: number, h: number, code: string): SheetCutInput {
  return { w, h, partCode: code, purpose: "Test" };
}

function pieceArea(p: PlacedPiece): number {
  return p.w * p.h;
}

describe("packSheets — empty / trivial", () => {
  test("empty cut list produces no layouts", () => {
    const { layouts, oversize } = packSheets([], 48, 96, 0.125);
    expect(layouts).toEqual([]);
    expect(oversize).toEqual([]);
  });

  test("one piece smaller than the sheet fits on one sheet", () => {
    const { layouts, oversize } = packSheets([cut(24, 48, "A")], 48, 96, 0.125);
    expect(oversize).toEqual([]);
    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.pieces).toHaveLength(1);
    expect(layouts[0]!.pieces[0]!.partCode).toBe("A");
  });
});

describe("packSheets — oversize handling", () => {
  test("a piece bigger than the sheet on any axis goes to oversize", () => {
    const { layouts, oversize } = packSheets([cut(50, 100, "BIG")], 48, 96, 0.125);
    expect(layouts).toEqual([]);
    expect(oversize).toHaveLength(1);
    expect(oversize[0]!.partCode).toBe("BIG");
  });

  test("a piece is rotated to fit if needed", () => {
    // 96 × 24 — wider than 48, but rotated fits perfectly.
    const { layouts, oversize } = packSheets([cut(96, 24, "ROT")], 48, 96, 0.125);
    expect(oversize).toEqual([]);
    expect(layouts).toHaveLength(1);
  });
});

describe("packSheets — placement constraints", () => {
  test("no two pieces overlap on the same sheet", () => {
    const cuts = [
      cut(24, 48, "A"),
      cut(24, 48, "B"),
      cut(24, 24, "C"),
      cut(24, 24, "D"),
    ];
    const { layouts } = packSheets(cuts, 48, 96, 0.125);
    for (const lay of layouts) {
      for (let i = 0; i < lay.pieces.length; i++) {
        for (let j = i + 1; j < lay.pieces.length; j++) {
          const a = lay.pieces[i]!;
          const b = lay.pieces[j]!;
          const sep =
            a.x + a.w <= b.x ||
            b.x + b.w <= a.x ||
            a.y + a.h <= b.y ||
            b.y + b.h <= a.y;
          expect(sep).toBe(true);
        }
      }
    }
  });

  test("all pieces lie inside the sheet bounds", () => {
    const cuts = Array.from({ length: 10 }, (_, i) => cut(12, 24, `P${i}`));
    const { layouts } = packSheets(cuts, 48, 96, 0.125);
    for (const lay of layouts) {
      for (const p of lay.pieces) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(lay.sheetW + 1e-9);
        expect(p.y + p.h).toBeLessThanOrEqual(lay.sheetH + 1e-9);
      }
    }
  });

  test("every input cut appears in the output exactly once", () => {
    const inputs = Array.from({ length: 8 }, (_, i) => cut(12, 24, `P${i}`));
    const { layouts, oversize } = packSheets(inputs, 48, 96, 0.125);
    const placedCodes = layouts.flatMap((l) => l.pieces.map((p) => p.partCode)).sort();
    const all = [...placedCodes, ...oversize.map((c) => c.partCode)].sort();
    expect(all).toEqual(inputs.map((c) => c.partCode).sort());
  });
});

describe("packSheets — yield math", () => {
  test("usedArea reflects sum of placed-piece areas", () => {
    const cuts = [cut(24, 96, "A"), cut(24, 48, "B")];
    const { layouts } = packSheets(cuts, 48, 96, 0);
    const totalArea = layouts.reduce((s, l) => s + l.usedArea, 0);
    expect(totalArea).toBe(24 * 96 + 24 * 48);
  });

  test("each layout's usedArea equals sum of its pieces' areas", () => {
    const cuts = Array.from({ length: 6 }, (_, i) => cut(20, 30, `P${i}`));
    const { layouts } = packSheets(cuts, 48, 96, 0.125);
    for (const lay of layouts) {
      const summed = lay.pieces.reduce((s, p) => s + pieceArea(p), 0);
      expect(lay.usedArea).toBeCloseTo(summed, 6);
    }
  });
});

describe("packSheets — sheet count is bounded", () => {
  test("never uses more sheets than there are pieces", () => {
    const cuts = Array.from({ length: 5 }, (_, i) => cut(40, 80, `P${i}`));
    const { layouts } = packSheets(cuts, 48, 96, 0.125);
    expect(layouts.length).toBeLessThanOrEqual(5);
  });

  test("two 24×96 pieces fit on one 48×96 sheet (no kerf)", () => {
    const { layouts } = packSheets([cut(24, 96, "A"), cut(24, 96, "B")], 48, 96, 0);
    expect(layouts).toHaveLength(1);
  });

  test("four 24×48 pieces fit on one 48×96 sheet (no kerf)", () => {
    const cuts = Array.from({ length: 4 }, (_, i) => cut(24, 48, `P${i}`));
    const { layouts } = packSheets(cuts, 48, 96, 0);
    expect(layouts).toHaveLength(1);
  });

  test("eight 24×48 pieces need two sheets", () => {
    const cuts = Array.from({ length: 8 }, (_, i) => cut(24, 48, `P${i}`));
    const { layouts } = packSheets(cuts, 48, 96, 0);
    expect(layouts).toHaveLength(2);
  });
});

describe("packSheets — sheet dimensions are normalized", () => {
  test("swapping W/H args gives the same sheet count", () => {
    const cuts = [cut(24, 96, "A"), cut(24, 96, "B")];
    const a = packSheets(cuts, 48, 96, 0);
    const b = packSheets(cuts, 96, 48, 0);
    expect(a.layouts.length).toBe(b.layouts.length);
  });
});
