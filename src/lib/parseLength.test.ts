import { describe, expect, test } from "bun:test";
import {
  feetInchesSchema,
  splitFeetInches,
  combineFeetInches,
  countSchema,
  inchesSchema,
} from "./parseLength";

describe("feetInchesSchema", () => {
  test("combines feet and inches into total inches", () => {
    const s = feetInchesSchema();
    expect(s.parse({ feet: 7, inches: 0 })).toBe(84);
    expect(s.parse({ feet: 7, inches: 6 })).toBe(90);
    expect(s.parse({ feet: 0, inches: 12 })).toBe(12);
    expect(s.parse({ feet: 6, inches: 0.5 })).toBe(72.5);
  });

  test("zero is valid", () => {
    expect(feetInchesSchema().parse({ feet: 0, inches: 0 })).toBe(0);
  });

  test("rejects negative inputs", () => {
    const s = feetInchesSchema();
    expect(() => s.parse({ feet: -1, inches: 0 })).toThrow();
    expect(() => s.parse({ feet: 0, inches: -2 })).toThrow();
  });

  test("rejects non-numbers", () => {
    const s = feetInchesSchema();
    expect(() => s.parse({ feet: "abc" as unknown as number, inches: 0 })).toThrow();
    expect(() => s.parse({ feet: NaN, inches: 0 })).toThrow();
  });

  test("enforces min/max on total inches", () => {
    const s = feetInchesSchema({ min: 24, max: 96, fieldName: "Length" });
    expect(s.parse({ feet: 4, inches: 0 })).toBe(48);
    expect(() => s.parse({ feet: 1, inches: 0 })).toThrow(/at least 24/);
    expect(() => s.parse({ feet: 9, inches: 0 })).toThrow(/at most 96/);
  });
});

describe("splitFeetInches / combineFeetInches", () => {
  test("splits cleanly on foot boundaries", () => {
    expect(splitFeetInches(84)).toEqual({ feet: 7, inches: 0 });
    expect(splitFeetInches(90)).toEqual({ feet: 7, inches: 6 });
    expect(splitFeetInches(0)).toEqual({ feet: 0, inches: 0 });
    expect(splitFeetInches(11)).toEqual({ feet: 0, inches: 11 });
  });

  test("preserves fractional inches", () => {
    const r = splitFeetInches(72.5);
    expect(r.feet).toBe(6);
    expect(r.inches).toBeCloseTo(0.5, 10);
  });

  test("round-trips through combine", () => {
    for (const v of [0, 1, 11.5, 12, 84, 90.25, 144.75]) {
      expect(combineFeetInches(splitFeetInches(v))).toBeCloseTo(v, 10);
    }
  });
});

describe("countSchema", () => {
  test("accepts integers in range", () => {
    expect(countSchema().parse(3)).toBe(3);
    expect(countSchema({ min: 1, max: 20 }).parse(20)).toBe(20);
  });

  test("rejects bad values", () => {
    const s = countSchema({ min: 1, max: 20 });
    expect(() => s.parse(1.5)).toThrow();
    expect(() => s.parse(0)).toThrow();
    expect(() => s.parse(21)).toThrow();
    expect(() => s.parse("3" as unknown as number)).toThrow();
  });
});

describe("inchesSchema", () => {
  test("accepts non-negative numbers by default", () => {
    expect(inchesSchema().parse(0)).toBe(0);
    expect(inchesSchema().parse(12.5)).toBe(12.5);
    expect(() => inchesSchema().parse(-1)).toThrow();
  });

  test("respects bounds", () => {
    const s = inchesSchema({ min: 10, max: 50 });
    expect(s.parse(25)).toBe(25);
    expect(() => s.parse(5)).toThrow();
    expect(() => s.parse(60)).toThrow();
  });
});
