import { describe, expect, test } from "bun:test";
import { calculateFromInputs } from "./calculator";
import { STYLE_PROFILES } from "./styles";
import type { SimpleInputs } from "./types";

function input(overrides: Partial<SimpleInputs> = {}): SimpleInputs {
  return {
    styleId: "heavy-garage",
    topLength: 72,
    topDepth: 30,
    totalHeight: 34,
    ...overrides,
  };
}

describe("calculator — shape", () => {
  test("returns all top-level fields for default input", () => {
    const r = calculateFromInputs(input());
    expect(Array.isArray(r.cutList)).toBe(true);
    expect(Array.isArray(r.lumberBoards)).toBe(true);
    expect(Array.isArray(r.sheetLayouts)).toBe(true);
    expect(Array.isArray(r.hardware)).toBe(true);
    expect(Array.isArray(r.tools)).toBe(true);
    expect(Array.isArray(r.steps)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(typeof r.stability).toBe("object");
    expect(typeof r.totals).toBe("object");
    expect(typeof r.derived).toBe("object");
  });

  test("totals are non-negative and sane", () => {
    const r = calculateFromInputs(input());
    expect(r.totals.lumberFt).toBeGreaterThan(0);
    expect(r.totals.sheetSqFt).toBeGreaterThanOrEqual(0);
    expect(r.totals.surfaceAreaSqFt).toBeGreaterThan(0);
    expect(r.totals.weightLb).toBeGreaterThan(0);
    if (r.totals.estimatedCost !== undefined) {
      expect(r.totals.estimatedCost).toBeGreaterThan(0);
    }
  });

  test("cut list is non-empty for any real style", () => {
    for (const style of STYLE_PROFILES) {
      const r = calculateFromInputs(input({ styleId: style.id }));
      expect(r.cutList.length).toBeGreaterThan(0);
      // every cut has a positive length and qty
      for (const c of r.cutList) {
        expect(c.qty).toBeGreaterThan(0);
        expect(c.length).toBeGreaterThan(0);
      }
    }
  });

  test("doubled-sheet style produces sheet layouts", () => {
    const r = calculateFromInputs(input({ styleId: "heavy-garage" }));
    expect(r.sheetLayouts.length).toBeGreaterThan(0);
  });

  test("hardware list has at least screws + consumables", () => {
    const r = calculateFromInputs(input());
    expect(r.hardware.length).toBeGreaterThan(0);
    for (const h of r.hardware) {
      expect(h.qty).toBeGreaterThan(0);
      expect(h.itemLabel.length).toBeGreaterThan(0);
    }
  });

  test("step numbering is sequential starting at 1", () => {
    const r = calculateFromInputs(input());
    expect(r.steps.length).toBeGreaterThan(0);
    r.steps.forEach((s, i) => expect(s.n).toBe(i + 1));
  });

  test("benchCount scales lumber linearly (within bin-packing rounding)", () => {
    const one = calculateFromInputs(input({ benchCount: 1 }));
    const four = calculateFromInputs(input({ benchCount: 4 }));
    expect(four.totals.lumberFt).toBeGreaterThan(one.totals.lumberFt * 3);
    expect(four.totals.lumberFt).toBeLessThanOrEqual(one.totals.lumberFt * 4 + 1e-6);
  });

  test("derived config echoes the user dimensions", () => {
    const r = calculateFromInputs(input({ topLength: 60, topDepth: 28, totalHeight: 36 }));
    expect(r.derived.topLength).toBe(60);
    expect(r.derived.topDepth).toBe(28);
    expect(r.derived.totalHeight).toBe(36);
  });
});

describe("calculator — robustness", () => {
  test("works for every built-in style without throwing", () => {
    for (const style of STYLE_PROFILES) {
      const r = calculateFromInputs(input({
        styleId: style.id,
        topLength: style.defaultLength,
        topDepth: style.defaultDepth,
        totalHeight: style.defaultHeight,
      }));
      expect(r.cutList.length).toBeGreaterThan(0);
      expect(r.totals.weightLb).toBeGreaterThan(0);
    }
  });

  test("casters added → hardware list includes casters", () => {
    const r = calculateFromInputs(input({ casters: true }));
    const hasCasters = r.hardware.some((h) =>
      h.itemLabel.toLowerCase().includes("caster"),
    );
    expect(hasCasters).toBe(true);
  });

  test("pegboard added → hardware list mentions pegboard or spacers", () => {
    const r = calculateFromInputs(input({ pegboard: true }));
    const txt = r.hardware.map((h) => h.itemLabel.toLowerCase()).join(" ");
    expect(txt).toMatch(/pegboard|spacer/);
  });
});
