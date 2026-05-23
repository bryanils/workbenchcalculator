import { describe, expect, test } from "bun:test";
import { toInches, fromInches, formatInches, formatMm, formatLength } from "./units";

describe("units — toInches/fromInches", () => {
  test("inch passthrough", () => {
    expect(toInches(10, "in")).toBe(10);
    expect(fromInches(10, "in")).toBe(10);
    expect(toInches(0, "in")).toBe(0);
  });

  test("mm conversion", () => {
    expect(toInches(25.4, "mm")).toBeCloseTo(1, 10);
    expect(fromInches(1, "mm")).toBeCloseTo(25.4, 10);
    expect(toInches(0, "mm")).toBe(0);
  });

  test("round-trip mm → in → mm", () => {
    for (const v of [10, 100, 838.2, 1219.2]) {
      expect(fromInches(toInches(v, "mm"), "mm")).toBeCloseTo(v, 6);
    }
  });

  test("negative values", () => {
    expect(toInches(-25.4, "mm")).toBeCloseTo(-1, 10);
    expect(fromInches(-2, "mm")).toBeCloseTo(-50.8, 10);
  });
});

describe("units — formatInches", () => {
  test("whole inches", () => {
    expect(formatInches(0)).toBe('0"');
    expect(formatInches(1)).toBe('1"');
    expect(formatInches(72)).toBe('72"');
  });

  test("common fractions", () => {
    expect(formatInches(0.5)).toBe('1/2"');
    expect(formatInches(0.25)).toBe('1/4"');
    expect(formatInches(0.75)).toBe('3/4"');
    expect(formatInches(0.125)).toBe('1/8"');
    expect(formatInches(0.0625)).toBe('1/16"');
  });

  test("whole + fraction", () => {
    expect(formatInches(1.5)).toBe('1 1/2"');
    expect(formatInches(12.25)).toBe('12 1/4"');
    expect(formatInches(72.75)).toBe('72 3/4"');
  });

  test("rounds to nearest 1/16", () => {
    expect(formatInches(0.04)).toBe('1/16"'); // 0.04 → 0.0625
    expect(formatInches(0.03)).toBe('0"');    // 0.03 → 0
    expect(formatInches(0.97)).toBe('1"');    // rounds up to 16/16
  });

  test("negative inches", () => {
    expect(formatInches(-1.5)).toBe('-1 1/2"');
    expect(formatInches(-0.25)).toBe('-1/4"');
  });

  test("reduces fractions", () => {
    expect(formatInches(0.5)).not.toBe('8/16"');
    expect(formatInches(0.25)).not.toBe('4/16"');
    expect(formatInches(0.75)).not.toBe('12/16"');
  });
});

describe("units — formatMm and formatLength", () => {
  test("formatMm rounds", () => {
    expect(formatMm(100)).toBe("100 mm");
    expect(formatMm(100.4)).toBe("100 mm");
    expect(formatMm(100.6)).toBe("101 mm");
  });

  test("formatLength dispatches on unit", () => {
    expect(formatLength(1, "in")).toBe('1"');
    expect(formatLength(1, "mm")).toBe("25 mm"); // 25.4 rounds to 25
    expect(formatLength(2, "mm")).toBe("51 mm"); // 50.8 rounds to 51
  });
});
