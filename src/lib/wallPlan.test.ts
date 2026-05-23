import { describe, expect, test } from "bun:test";
import { planWall, type WallPlanOption } from "./wallPlan";

const baseInputs = {
  benchDepthIn: 24,
  benchHeightIn: 34,
  styleId: "heavy-garage" as const,
};

function sumLengths(opt: WallPlanOption): number {
  return opt.benches.reduce((s, g) => s + g.lengthIn * g.count, 0);
}

describe("planWall — basic shape", () => {
  test("returns [] on bad input", () => {
    expect(planWall({ ...baseInputs, wallLengthIn: 0 })).toEqual([]);
    expect(planWall({ ...baseInputs, wallLengthIn: -1 })).toEqual([]);
    expect(planWall({ ...baseInputs, wallLengthIn: 100, benchDepthIn: 0 })).toEqual([]);
    expect(
      planWall({ ...baseInputs, wallLengthIn: 100, minBenchLengthIn: 90, maxBenchLengthIn: 80 }),
    ).toEqual([]);
  });

  test("returns [] when wall is shorter than min bench length", () => {
    // 40" wall, default min 48" — no plan fits.
    expect(planWall({ ...baseInputs, wallLengthIn: 40 })).toEqual([]);
  });

  test("all suggestions exactly fill the wall", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 210 });
    expect(opts.length).toBeGreaterThan(0);
    for (const opt of opts) {
      expect(sumLengths(opt)).toBeCloseTo(210, 6);
    }
  });

  test("all suggestions respect min/max bench length", () => {
    const opts = planWall({
      ...baseInputs,
      wallLengthIn: 210,
      minBenchLengthIn: 48,
      maxBenchLengthIn: 96,
    });
    for (const opt of opts) {
      for (const g of opt.benches) {
        expect(g.lengthIn).toBeGreaterThanOrEqual(48 - 1e-6);
        expect(g.lengthIn).toBeLessThanOrEqual(96 + 1e-6);
      }
    }
  });

  test("sorted descending by score", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 210 });
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i - 1]!.score).toBeGreaterThanOrEqual(opts[i]!.score);
    }
  });
});

describe("planWall — practical recommendations", () => {
  test("210\" recommends 3 × 70 as top suggestion", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 210 });
    const top = opts[0]!;
    expect(top.benches).toEqual([{ lengthIn: 70, count: 3 }]);
    expect(top.totalBenchCount).toBe(3);
    expect(top.distinctLengths).toBe(1);
  });

  test("210\" never proposes 5 × 42 (below default min 48)", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 210 });
    for (const opt of opts) {
      for (const g of opt.benches) {
        expect(g.lengthIn).toBeGreaterThanOrEqual(48);
      }
    }
  });

  test("192\" recommends 2 × 96", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 192 });
    const top = opts[0]!;
    expect(top.benches).toEqual([{ lengthIn: 96, count: 2 }]);
  });

  test("144\" recommends 2 × 72 over 3 × 48", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 144 });
    const top = opts[0]!;
    expect(top.benches).toEqual([{ lengthIn: 72, count: 2 }]);
  });

  test("96\" wall yields a single 96\" bench", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 96 });
    const top = opts[0]!;
    expect(top.benches).toEqual([{ lengthIn: 96, count: 1 }]);
    expect(top.totalBenchCount).toBe(1);
  });
});

describe("planWall — caps", () => {
  test("never returns more than 6 benches in any option", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 576 }); // 48 ft
    for (const opt of opts) {
      expect(opt.totalBenchCount).toBeLessThanOrEqual(6);
    }
  });

  test("returns at most 8 options", () => {
    const opts = planWall({ ...baseInputs, wallLengthIn: 240 });
    expect(opts.length).toBeLessThanOrEqual(8);
  });
});
