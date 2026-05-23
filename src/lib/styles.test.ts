import { describe, expect, test } from "bun:test";
import { STYLE_PROFILES, getStyle } from "./styles";
import { getLumber, getSheet } from "./materials";

describe("styles — catalog integrity", () => {
  test("at least one style is defined", () => {
    expect(STYLE_PROFILES.length).toBeGreaterThan(0);
  });

  test("all style IDs are unique", () => {
    const ids = STYLE_PROFILES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every style has a non-empty name, blurb, useCase, designNotes", () => {
    for (const s of STYLE_PROFILES) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(0);
      expect(s.useCase.length).toBeGreaterThan(0);
      expect(s.designNotes.length).toBeGreaterThan(0);
    }
  });

  test("default dimensions lie within each style's ranges", () => {
    for (const s of STYLE_PROFILES) {
      expect(s.defaultLength).toBeGreaterThanOrEqual(s.lengthRange[0]);
      expect(s.defaultLength).toBeLessThanOrEqual(s.lengthRange[1]);
      expect(s.defaultDepth).toBeGreaterThanOrEqual(s.depthRange[0]);
      expect(s.defaultDepth).toBeLessThanOrEqual(s.depthRange[1]);
      expect(s.defaultHeight).toBeGreaterThanOrEqual(s.heightRange[0]);
      expect(s.defaultHeight).toBeLessThanOrEqual(s.heightRange[1]);
    }
  });

  test("ranges are ordered (min ≤ max)", () => {
    for (const s of STYLE_PROFILES) {
      expect(s.lengthRange[0]).toBeLessThanOrEqual(s.lengthRange[1]);
      expect(s.depthRange[0]).toBeLessThanOrEqual(s.depthRange[1]);
      expect(s.heightRange[0]).toBeLessThanOrEqual(s.heightRange[1]);
    }
  });

  test("every material id referenced by a style exists in the catalog", () => {
    for (const s of STYLE_PROFILES) {
      expect(getLumber(s.legMaterialId)).toBeDefined();
      expect(getLumber(s.apronMaterialId)).toBeDefined();
      expect(getLumber(s.stretcherMaterialId)).toBeDefined();
      // topMaterialId can be a sheet or a lumber id depending on construction
      if (s.topConstruction === "single-sheet" || s.topConstruction === "doubled-sheet") {
        expect(getSheet(s.topMaterialId)).toBeDefined();
      } else {
        expect(getLumber(s.topMaterialId)).toBeDefined();
      }
    }
  });

  test("dogHoleSpacing positive when dogHoles true", () => {
    for (const s of STYLE_PROFILES) {
      if (s.dogHoles) expect(s.dogHoleSpacing).toBeGreaterThan(0);
    }
  });

  test("legSplayDeg is sane", () => {
    for (const s of STYLE_PROFILES) {
      expect(s.legSplayDeg).toBeGreaterThanOrEqual(0);
      expect(s.legSplayDeg).toBeLessThanOrEqual(20);
    }
  });
});

describe("styles — getStyle", () => {
  test("returns the matching style", () => {
    expect(getStyle("heavy-garage")?.id).toBe("heavy-garage");
  });

  test("returns undefined for unknown id", () => {
    expect(getStyle("does-not-exist")).toBeUndefined();
  });
});
