import { describe, expect, test } from "bun:test";
import { parseLengthToInches, lengthInchesSchema, countSchema } from "./parseLength";

describe("parseLengthToInches — feet", () => {
  test("whole feet", () => {
    expect(parseLengthToInches("7'", "in")).toBe(84);
    expect(parseLengthToInches("7 ft", "in")).toBe(84);
    expect(parseLengthToInches("7ft", "in")).toBe(84);
    expect(parseLengthToInches("7 feet", "in")).toBe(84);
    expect(parseLengthToInches("1'", "in")).toBe(12);
  });

  test("decimal feet", () => {
    expect(parseLengthToInches("7.5'", "in")).toBe(90);
    expect(parseLengthToInches("0.5 ft", "in")).toBe(6);
  });

  test("feet + inches", () => {
    expect(parseLengthToInches("7'6\"", "in")).toBe(90);
    expect(parseLengthToInches("7' 6\"", "in")).toBe(90);
    expect(parseLengthToInches("7'6", "in")).toBe(90);
    expect(parseLengthToInches("7 ft 6 in", "in")).toBe(90);
    expect(parseLengthToInches("7 feet 6 inches", "in")).toBe(90);
  });

  test("feet + fractional inches", () => {
    expect(parseLengthToInches("7' 6 1/2\"", "in")).toBe(90.5);
    expect(parseLengthToInches("7' 1/2\"", "in")).toBe(84.5);
    expect(parseLengthToInches("7'6 1/2", "in")).toBe(90.5);
  });
});

describe("parseLengthToInches — inches", () => {
  test("with marker", () => {
    expect(parseLengthToInches("12\"", "in")).toBe(12);
    expect(parseLengthToInches("12 in", "in")).toBe(12);
    expect(parseLengthToInches("12 inches", "in")).toBe(12);
  });

  test("fractional inches", () => {
    expect(parseLengthToInches("1/2\"", "in")).toBe(0.5);
    expect(parseLengthToInches("6 1/2\"", "in")).toBe(6.5);
    expect(parseLengthToInches("12.25\"", "in")).toBe(12.25);
  });

  test("smart quotes are normalized", () => {
    expect(parseLengthToInches("7′ 6″", "in")).toBe(90);
    expect(parseLengthToInches("12”", "in")).toBe(12);
  });
});

describe("parseLengthToInches — metric", () => {
  test("mm", () => {
    expect(parseLengthToInches("25.4 mm", "in")).toBeCloseTo(1, 10);
    expect(parseLengthToInches("1219.2mm", "in")).toBeCloseTo(48, 6);
  });

  test("cm", () => {
    expect(parseLengthToInches("2.54 cm", "in")).toBeCloseTo(1, 10);
    expect(parseLengthToInches("100cm", "in")).toBeCloseTo(39.3701, 3);
  });

  test("m", () => {
    expect(parseLengthToInches("1 m", "in")).toBeCloseTo(39.3701, 3);
    expect(parseLengthToInches("1.5m", "in")).toBeCloseTo(59.0551, 3);
  });
});

describe("parseLengthToInches — bare numbers", () => {
  test("uses default unit (in)", () => {
    expect(parseLengthToInches("72", "in")).toBe(72);
    expect(parseLengthToInches("12.5", "in")).toBe(12.5);
    expect(parseLengthToInches("6 1/2", "in")).toBe(6.5);
    expect(parseLengthToInches("1/2", "in")).toBe(0.5);
  });

  test("uses default unit (mm)", () => {
    expect(parseLengthToInches("25.4", "mm")).toBeCloseTo(1, 10);
    expect(parseLengthToInches("1219.2", "mm")).toBeCloseTo(48, 6);
  });
});

describe("parseLengthToInches — invalid", () => {
  test("returns null for nonsense", () => {
    expect(parseLengthToInches("", "in")).toBeNull();
    expect(parseLengthToInches("abc", "in")).toBeNull();
    expect(parseLengthToInches("7 monkeys", "in")).toBeNull();
    expect(parseLengthToInches("1//2", "in")).toBeNull();
    expect(parseLengthToInches("1/0", "in")).toBeNull();
    expect(parseLengthToInches("--5", "in")).toBeNull();
  });
});

describe("lengthInchesSchema", () => {
  test("parses valid input", () => {
    const s = lengthInchesSchema({ defaultUnit: "in" });
    expect(s.parse("7'")).toBe(84);
    expect(s.parse("12.5")).toBe(12.5);
  });

  test("enforces min/max", () => {
    const s = lengthInchesSchema({ defaultUnit: "in", min: 24, max: 96, fieldName: "Length" });
    expect(s.parse("48")).toBe(48);
    expect(() => s.parse("12")).toThrow(/at least 24/);
    expect(() => s.parse("120")).toThrow(/at most 96/);
  });

  test("rejects unparseable input", () => {
    const s = lengthInchesSchema({ defaultUnit: "in" });
    expect(() => s.parse("not a number")).toThrow(/could not parse/);
  });
});

describe("countSchema", () => {
  test("parses integers", () => {
    const s = countSchema();
    expect(s.parse("3")).toBe(3);
  });

  test("rejects non-integers and out-of-range", () => {
    const s = countSchema({ min: 1, max: 20 });
    expect(() => s.parse("1.5")).toThrow();
    expect(() => s.parse("0")).toThrow();
    expect(() => s.parse("21")).toThrow();
    expect(() => s.parse("abc")).toThrow();
  });
});
