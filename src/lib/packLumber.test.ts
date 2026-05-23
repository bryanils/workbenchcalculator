import { describe, expect, test } from "bun:test";
import { packLumberBoards, type LumberCutInput } from "./packLumber";

const STOCK = [96, 120, 144, 168, 192];

function cut(len: number, code = "P", purpose = "leg"): LumberCutInput {
  return { len, partCode: code, purpose };
}

describe("packLumberBoards — empty / trivial", () => {
  test("empty cut list returns no boards", () => {
    const { boards, oversize } = packLumberBoards([], STOCK, 0.125, "any");
    expect(boards).toEqual([]);
    expect(oversize).toEqual([]);
  });

  test("single cut shorter than smallest stock uses smallest stock", () => {
    const { boards } = packLumberBoards([cut(30)], STOCK, 0.125, "any");
    expect(boards).toHaveLength(1);
    expect(boards[0]!.stockLen).toBe(96);
    expect(boards[0]!.cuts.map((c) => c.len)).toEqual([30]);
    expect(boards[0]!.wasteLen).toBe(66);
  });
});

describe("packLumberBoards — oversize handling", () => {
  test("cuts longer than the longest stock land in oversize", () => {
    const { boards, oversize } = packLumberBoards([cut(250)], STOCK, 0.125, "any");
    expect(boards).toEqual([]);
    expect(oversize).toHaveLength(1);
    expect(oversize[0]!.len).toBe(250);
  });

  test("oversize and fitting cuts split correctly", () => {
    const cuts = [cut(250), cut(48), cut(72)];
    const { boards, oversize } = packLumberBoards(cuts, STOCK, 0.125, "any");
    expect(oversize).toHaveLength(1);
    expect(boards.length).toBeGreaterThanOrEqual(1);
    const placedLens = boards.flatMap((b) => b.cuts.map((c) => c.len)).sort();
    expect(placedLens).toEqual([48, 72]);
  });
});

describe("packLumberBoards — bin packing", () => {
  test("two cuts that fit in one board use one board (with kerf)", () => {
    // 48 + 0.125 kerf + 47 = 95.125 ≤ 96 ✓
    const { boards } = packLumberBoards([cut(48), cut(47)], STOCK, 0.125, 96);
    expect(boards).toHaveLength(1);
    expect(boards[0]!.cuts).toHaveLength(2);
    expect(boards[0]!.stockLen).toBe(96);
  });

  test("two cuts that would overflow a board use two boards", () => {
    // 48 + 0.125 + 48 = 96.125 > 96 → must split
    const { boards } = packLumberBoards([cut(48), cut(48)], STOCK, 0.125, 96);
    expect(boards).toHaveLength(2);
  });

  test("descending-size FFD: bigger cuts placed first", () => {
    const cuts = [cut(20), cut(80)];
    const { boards } = packLumberBoards(cuts, STOCK, 0.125, "any");
    // First board should have the 80" cut.
    expect(boards[0]!.cuts[0]!.len).toBe(80);
  });

  test("kerf is only added between cuts, not at the end", () => {
    // 96" stock with one 96" cut: should fit exactly (no trailing kerf)
    const { boards } = packLumberBoards([cut(96)], STOCK, 0.125, 96);
    expect(boards).toHaveLength(1);
    expect(boards[0]!.wasteLen).toBe(0);
    expect(boards[0]!.kerfTotal).toBe(0);
  });

  test("waste = stock − cuts − kerfs", () => {
    const cuts = [cut(48), cut(40)]; // 88 cuts + 0.125 kerf = 88.125; 96-88.125 = 7.875
    const { boards } = packLumberBoards(cuts, STOCK, 0.125, 96);
    expect(boards).toHaveLength(1);
    expect(boards[0]!.wasteLen).toBeCloseTo(7.875, 6);
    expect(boards[0]!.kerfTotal).toBeCloseTo(0.125, 6);
  });
});

describe("packLumberBoards — stock preference", () => {
  test("preference picks the preferred stock when cut fits", () => {
    const { boards } = packLumberBoards([cut(50)], STOCK, 0.125, 144);
    expect(boards[0]!.stockLen).toBe(144);
  });

  test("'any' picks the shortest stock that fits", () => {
    const { boards } = packLumberBoards([cut(50)], STOCK, 0.125, "any");
    expect(boards[0]!.stockLen).toBe(96);
  });

  test("preference falls back to longest when preferred is too short", () => {
    // Preferred 96, but cut is 130 (>96, ≤192)
    const { boards } = packLumberBoards([cut(130)], STOCK, 0.125, 96);
    // Should pick 144 since 'any' fallback picks shortest that fits and 144≥130
    expect(boards[0]!.stockLen).toBeGreaterThanOrEqual(130);
  });
});

describe("packLumberBoards — many cuts", () => {
  test("4 × 96 cuts produce 4 boards of 96", () => {
    const cuts = Array.from({ length: 4 }, () => cut(96));
    const { boards } = packLumberBoards(cuts, STOCK, 0.125, 96);
    expect(boards).toHaveLength(4);
    for (const b of boards) {
      expect(b.stockLen).toBe(96);
      expect(b.cuts).toHaveLength(1);
      expect(b.wasteLen).toBe(0);
    }
  });

  test("packing is conservative — never overflows a board", () => {
    const cuts = [cut(80), cut(40), cut(30), cut(15), cut(60), cut(20), cut(95)];
    const { boards } = packLumberBoards(cuts, STOCK, 0.125, "any");
    for (const b of boards) {
      const used =
        b.cuts.reduce((s, c) => s + c.len, 0) +
        Math.max(0, b.cuts.length - 1) * 0.125;
      expect(used).toBeLessThanOrEqual(b.stockLen + 1e-9);
    }
  });

  test("every input cut appears in the boards exactly once", () => {
    const inputs = [cut(80, "A"), cut(40, "B"), cut(30, "C"), cut(95, "D"), cut(60, "E")];
    const { boards, oversize } = packLumberBoards(inputs, STOCK, 0.125, "any");
    const placedCodes = boards.flatMap((b) => b.cuts.map((c) => c.partCode));
    const all = [...placedCodes, ...oversize.map((c) => c.partCode)].sort();
    expect(all).toEqual(["A", "B", "C", "D", "E"]);
  });
});
