import { describe, expect, test } from "bun:test";
import {
  LUMBER,
  SHEETS,
  SCREWS,
  CONSUMABLES,
  getLumber,
  getSheet,
  getScrew,
} from "./materials";

describe("materials — catalog integrity", () => {
  test("all lumber entries have positive dressed dimensions and at least one stock length", () => {
    for (const l of LUMBER) {
      expect(l.id.length).toBeGreaterThan(0);
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.actualWidth).toBeGreaterThan(0);
      expect(l.actualDepth).toBeGreaterThan(0);
      expect(l.actualWidth).toBeLessThanOrEqual(l.actualDepth);
      expect(l.stockLengths.length).toBeGreaterThan(0);
      for (const s of l.stockLengths) expect(s).toBeGreaterThan(0);
      if (l.pricePerFt !== undefined) expect(l.pricePerFt).toBeGreaterThan(0);
    }
  });

  test("known dressed dimensions match the US softwood standard", () => {
    expect(getLumber("2x4")).toMatchObject({ actualWidth: 1.5, actualDepth: 3.5 });
    expect(getLumber("2x6")).toMatchObject({ actualWidth: 1.5, actualDepth: 5.5 });
    expect(getLumber("4x4")).toMatchObject({ actualWidth: 3.5, actualDepth: 3.5 });
    expect(getLumber("6x6")).toMatchObject({ actualWidth: 5.5, actualDepth: 5.5 });
  });

  test("all sheet entries are 48 × 96 with positive thickness", () => {
    for (const s of SHEETS) {
      expect(s.width).toBe(48);
      expect(s.height).toBe(96);
      expect(s.thickness).toBeGreaterThan(0);
      expect(s.thickness).toBeLessThan(2);
      if (s.pricePerSheet !== undefined) expect(s.pricePerSheet).toBeGreaterThan(0);
    }
  });

  test("plywood 3/4 is exactly 0.75 thick", () => {
    expect(getSheet("ply_3_4")?.thickness).toBe(0.75);
  });

  test("all screw entries have positive length and a use note", () => {
    for (const s of SCREWS) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.lengthIn).toBeGreaterThan(0);
      expect(s.use.length).toBeGreaterThan(0);
    }
  });

  test("all material IDs are unique within their catalog", () => {
    const lumIds = LUMBER.map((l) => l.id);
    expect(new Set(lumIds).size).toBe(lumIds.length);
    const sheetIds = SHEETS.map((s) => s.id);
    expect(new Set(sheetIds).size).toBe(sheetIds.length);
    const screwIds = SCREWS.map((s) => s.id);
    expect(new Set(screwIds).size).toBe(screwIds.length);
  });
});

describe("materials — getters", () => {
  test("get* returns undefined for unknown ids", () => {
    expect(getLumber("nope")).toBeUndefined();
    expect(getSheet("nope")).toBeUndefined();
    expect(getScrew("nope")).toBeUndefined();
  });

  test("get* returns the matching record by id", () => {
    expect(getLumber("4x4")?.id).toBe("4x4");
    expect(getSheet("ply_3_4")?.id).toBe("ply_3_4");
    expect(getScrew("pocket_2_1_2")?.id).toBe("pocket_2_1_2");
  });
});

describe("materials — consumables", () => {
  test("has expected consumables with positive prices and labels", () => {
    const keys = ["wood_glue_oz", "finish_oz", "sandpaper", "caster", "edge_band_ft"] as const;
    for (const k of keys) {
      const c = CONSUMABLES[k];
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.unit.length).toBeGreaterThan(0);
      expect(c.pricePerUnit).toBeGreaterThan(0);
    }
  });
});
