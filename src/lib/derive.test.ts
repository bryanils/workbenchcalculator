import { describe, expect, test } from "bun:test";
import { deriveBenchConfig, deriveGeometry, deriveDrawerGeometry } from "./derive";
import { STYLE_PROFILES } from "./styles";
import type { SimpleInputs } from "./types";

function baseInput(overrides: Partial<SimpleInputs> = {}): SimpleInputs {
  return {
    styleId: "heavy-garage",
    topLength: 72,
    topDepth: 30,
    totalHeight: 34,
    ...overrides,
  };
}

describe("deriveBenchConfig — basics", () => {
  test("respects user dimensions when in range", () => {
    const c = deriveBenchConfig(baseInput({ topLength: 80, topDepth: 28, totalHeight: 36 }));
    expect(c.topLength).toBe(80);
    expect(c.topDepth).toBe(28);
    expect(c.totalHeight).toBe(36);
  });

  test("clamps dimensions outside the style range", () => {
    const style = STYLE_PROFILES.find((s) => s.id === "heavy-garage")!;
    const c = deriveBenchConfig(baseInput({ topLength: style.lengthRange[1] + 100 }));
    expect(c.topLength).toBe(style.lengthRange[1]);
    const c2 = deriveBenchConfig(baseInput({ topDepth: style.depthRange[0] - 50 }));
    expect(c2.topDepth).toBe(style.depthRange[0]);
  });

  test("unknown styleId falls back to heavy-garage", () => {
    const c = deriveBenchConfig(baseInput({ styleId: "not-a-style" as never }));
    expect(c.styleId).toBe("heavy-garage");
  });

  test("benchCount clamps to [1, 20]", () => {
    expect(deriveBenchConfig(baseInput({ benchCount: 0 })).benchCount).toBe(1);
    expect(deriveBenchConfig(baseInput({ benchCount: 50 })).benchCount).toBe(20);
    expect(deriveBenchConfig(baseInput({ benchCount: 5 })).benchCount).toBe(5);
    expect(deriveBenchConfig(baseInput()).benchCount).toBe(1);
  });

  test("kerf defaults to 0.125 but can be overridden", () => {
    expect(deriveBenchConfig(baseInput()).kerf).toBe(0.125);
    expect(deriveBenchConfig(baseInput({ kerf: 0.0625 })).kerf).toBe(0.0625);
  });

  test("topSheetLayers reflects topConstruction", () => {
    for (const style of STYLE_PROFILES) {
      const c = deriveBenchConfig(baseInput({ styleId: style.id }));
      if (style.topConstruction === "doubled-sheet") expect(c.topSheetLayers).toBe(2);
      else if (style.topConstruction === "single-sheet") expect(c.topSheetLayers).toBe(1);
      else expect(c.topSheetLayers).toBe(0);
    }
  });

  test("vise override is honored", () => {
    const c = deriveBenchConfig(baseInput({ viseOverride: "tail-vise" }));
    expect(c.vise).toBe("tail-vise");
  });

  test("joinery override is honored", () => {
    const c = deriveBenchConfig(baseInput({ joineryOverride: "mortise" }));
    expect(c.joinery).toBe("mortise");
  });
});

describe("deriveGeometry — sanity", () => {
  test("top thickness matches construction", () => {
    const single = deriveGeometry(deriveBenchConfig(baseInput({ styleId: "kid-bench" })));
    expect(single.topThickness).toBeCloseTo(0.75, 6);
    const doubled = deriveGeometry(deriveBenchConfig(baseInput({ styleId: "heavy-garage" })));
    expect(doubled.topThickness).toBeCloseTo(1.5, 6);
  });

  test("leg cut length is total height minus top thickness (no casters)", () => {
    const c = deriveBenchConfig(baseInput({ totalHeight: 34 }));
    const g = deriveGeometry(c);
    expect(g.legCutLength).toBeCloseTo(34 - g.topThickness, 6);
    expect(g.casterHeight).toBe(0);
  });

  test("casters add 3.5\" to caster height", () => {
    const c = deriveBenchConfig(baseInput({ casters: true }));
    const g = deriveGeometry(c);
    expect(g.casterHeight).toBe(3.5);
    expect(g.legCutLength).toBeCloseTo(c.totalHeight - g.topThickness - 3.5, 6);
  });

  test("legSpan = topLength/topDepth minus 2× overhang", () => {
    const c = deriveBenchConfig(baseInput({ topLength: 72, topDepth: 30 }));
    const g = deriveGeometry(c);
    expect(g.legSpanLong).toBe(72 - 2 * c.overhangSide);
    expect(g.legSpanShort).toBe(30 - 2 * c.overhangFront);
  });

  test("no-splay → floor span equals leg span", () => {
    const c = deriveBenchConfig(baseInput({ styleId: "heavy-garage" })); // splay=0
    const g = deriveGeometry(c);
    expect(g.floorSpanShort).toBe(g.legSpanShort);
    expect(g.floorSpanLong).toBe(g.legSpanLong);
    expect(g.legCutBlankLength).toBeCloseTo(g.legCutLength, 6);
  });

  test("splayed legs widen the short floor span and use a longer blank", () => {
    const c = deriveBenchConfig(baseInput({ styleId: "moravian-knockdown" }));
    const g = deriveGeometry(c);
    if (c.legSplayDeg > 0) {
      expect(g.floorSpanShort).toBeGreaterThan(g.legSpanShort);
      expect(g.legCutBlankLength).toBeGreaterThan(g.legCutLength);
    }
  });

  test("insideLong/insideShort never negative", () => {
    for (const style of STYLE_PROFILES) {
      const c = deriveBenchConfig(baseInput({
        styleId: style.id,
        topLength: style.defaultLength,
        topDepth: style.defaultDepth,
        totalHeight: style.defaultHeight,
      }));
      const g = deriveGeometry(c);
      expect(g.insideLongTop).toBeGreaterThan(0);
      expect(g.insideShortTop).toBeGreaterThan(0);
    }
  });
});

describe("deriveDrawerGeometry", () => {
  test("returns null when drawerCount is 0", () => {
    const c = deriveBenchConfig(baseInput({ drawerCount: 0 }));
    const g = deriveGeometry(c);
    expect(deriveDrawerGeometry(c, g)).toBeNull();
  });

  test("under-top: bank width spans insideLongTop, drawer width divides it", () => {
    const c = deriveBenchConfig(baseInput({ drawerCount: 3, drawerLocation: "under-top" }));
    const g = deriveGeometry(c);
    const d = deriveDrawerGeometry(c, g)!;
    expect(d).not.toBeNull();
    expect(d.bankWidth).toBeCloseTo(g.insideLongTop, 6);
    // Each drawer ~ insideLongTop / 3, minus kerf and slide clearance
    expect(d.openingWidth).toBeGreaterThan(0);
    expect(d.openingWidth).toBeLessThan(g.insideLongTop / 3);
  });

  test("too many drawers in a small bench raises a warning", () => {
    const c = deriveBenchConfig(baseInput({ drawerCount: 20, drawerLocation: "under-top" }));
    const g = deriveGeometry(c);
    const d = deriveDrawerGeometry(c, g)!;
    expect(d.warnings.length).toBeGreaterThan(0);
  });

  test("box dimensions are smaller than opening dimensions", () => {
    const c = deriveBenchConfig(baseInput({ drawerCount: 2, drawerLocation: "under-top" }));
    const g = deriveGeometry(c);
    const d = deriveDrawerGeometry(c, g)!;
    expect(d.boxWidth).toBeLessThan(d.openingWidth);
    expect(d.boxHeight).toBeLessThan(d.openingHeight);
    expect(d.boxDepth).toBeLessThan(d.bankDepth);
  });
});
