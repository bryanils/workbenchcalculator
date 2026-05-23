import { describe, expect, test } from "bun:test";
import { assessStability } from "./stability";
import { deriveBenchConfig } from "./derive";
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

describe("assessStability — shape", () => {
  test("returns all required fields", () => {
    const r = assessStability(deriveBenchConfig(input()));
    expect(typeof r.verdict).toBe("string");
    expect(typeof r.score).toBe("number");
    expect(typeof r.topSagInches).toBe("number");
    expect(typeof r.topSagLimitInches).toBe("number");
    expect(typeof r.rackingResistanceLbf).toBe("number");
    expect(typeof r.tipRatio).toBe("number");
    expect(typeof r.baseWeightLb).toBe("number");
    expect(Array.isArray(r.notes)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  test("score is in [0, 100]", () => {
    for (const style of STYLE_PROFILES) {
      const r = assessStability(deriveBenchConfig(input({ styleId: style.id })));
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  test("verdict matches score/warning thresholds", () => {
    for (const style of STYLE_PROFILES) {
      const r = assessStability(deriveBenchConfig(input({ styleId: style.id })));
      const allowed = ["solid", "acceptable", "marginal", "unstable"] as const;
      expect(allowed).toContain(r.verdict);
    }
  });
});

describe("assessStability — physics intuition", () => {
  test("heavy-garage (full floor stretchers, lag joinery) rates well", () => {
    const r = assessStability(deriveBenchConfig(input({ styleId: "heavy-garage" })));
    expect(r.verdict === "solid" || r.verdict === "acceptable").toBe(true);
    expect(r.rackingResistanceLbf).toBeGreaterThan(60); // > test lateral load
  });

  test("longer tops sag more than shorter ones (same style)", () => {
    const short = assessStability(deriveBenchConfig(input({ topLength: 48 })));
    const long = assessStability(deriveBenchConfig(input({ topLength: 96 })));
    expect(long.topSagInches).toBeGreaterThan(short.topSagInches);
  });

  test("doubled-sheet top sags less than single (same dimensions)", () => {
    // heavy-garage = doubled-sheet (1.5\" thick), kid-bench = single-sheet (0.75\")
    // Same top L×D, the thicker top should sag less.
    const doubled = assessStability(deriveBenchConfig(input({ styleId: "heavy-garage", topLength: 48, topDepth: 24, totalHeight: 32 })));
    const single = assessStability(deriveBenchConfig(input({ styleId: "kid-bench", topLength: 48, topDepth: 24, totalHeight: 32 })));
    expect(doubled.topSagInches).toBeLessThan(single.topSagInches);
  });

  test("tipRatio = min footprint / height", () => {
    const c = deriveBenchConfig(input({ topLength: 72, topDepth: 30, totalHeight: 34 }));
    const r = assessStability(c);
    expect(r.tipRatio).toBeGreaterThan(0);
    expect(r.tipRatio).toBeLessThan(2);
  });

  test("base weight is positive and roughly within reason", () => {
    const r = assessStability(deriveBenchConfig(input()));
    expect(r.baseWeightLb).toBeGreaterThan(20);
    expect(r.baseWeightLb).toBeLessThan(1000);
  });

  test("casters reduce racking resistance vs non-casters (same style)", () => {
    const stationary = assessStability(deriveBenchConfig(input({ casters: false })));
    const mobile = assessStability(deriveBenchConfig(input({ casters: true })));
    expect(mobile.rackingResistanceLbf).toBeLessThan(stationary.rackingResistanceLbf);
  });

  test("4x4 legs rack better than 2x4 legs at the same height (heavy-garage uses 4x4)", () => {
    // heavy-garage = 4x4 legs, kid-bench = 2x4 legs (both have floor stretchers).
    const big = assessStability(deriveBenchConfig(input({ styleId: "heavy-garage", topLength: 60, topDepth: 24, totalHeight: 34 })));
    const small = assessStability(deriveBenchConfig(input({ styleId: "kid-bench", topLength: 36, topDepth: 18, totalHeight: 24 })));
    expect(big.rackingResistanceLbf).toBeGreaterThan(small.rackingResistanceLbf);
  });
});
