import { describe, expect, test } from "bun:test";
import { PRESETS } from "./presets";
import { STYLE_PROFILES } from "./styles";
import { deriveBenchConfig } from "./derive";

describe("presets — integrity", () => {
  test("one preset per style", () => {
    expect(PRESETS.length).toBe(STYLE_PROFILES.length);
  });

  test("preset IDs match style IDs and are unique", () => {
    const presetIds = PRESETS.map((p) => p.id);
    const styleIds = STYLE_PROFILES.map((s) => s.id);
    expect(new Set(presetIds).size).toBe(presetIds.length);
    expect(presetIds.sort()).toEqual(styleIds.sort());
  });

  test("each preset has a non-empty name and description", () => {
    for (const p of PRESETS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  test("each preset's input.styleId equals preset id", () => {
    for (const p of PRESETS) {
      expect(p.input.styleId).toBe(p.id);
    }
  });

  test("each preset derives a valid bench config", () => {
    for (const p of PRESETS) {
      const c = deriveBenchConfig(p.input);
      expect(c.styleId).toBe(p.id);
      expect(c.topLength).toBeGreaterThan(0);
      expect(c.topDepth).toBeGreaterThan(0);
      expect(c.totalHeight).toBeGreaterThan(0);
    }
  });
});
