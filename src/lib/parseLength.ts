import { z } from "zod";
import type { Unit } from "./units";

const MM_PER_INCH = 25.4;

// Parse a numeric token: "5", "5.25", "1/2", "5 1/2", ".5"
function parseNumericToken(s: string): number | null {
  const t = s.trim();
  if (!t) return null;

  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t);
  if (mixed) {
    const w = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    if (d === 0) return null;
    return w + n / d;
  }

  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac) {
    const n = Number(frac[1]);
    const d = Number(frac[2]);
    if (d === 0) return null;
    return n / d;
  }

  const dec = /^(?:\d+(?:\.\d+)?|\.\d+)$/.exec(t);
  if (dec) return Number(t);

  return null;
}

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\.\d+)`;

// Parse a length expression into inches. Returns null if unparseable.
// Accepts (case-insensitive):
//   bare number       — interpreted in `defaultUnit`
//   N", N in, N inches
//   N', N ft, N feet
//   N' M", N'M, N ft M in   (mixed feet + inches)
//   N mm, N cm, N m
//   fractions (1/2) and mixed (5 1/2) anywhere a number is allowed
export function parseLengthToInches(
  input: string,
  defaultUnit: Unit,
): number | null {
  if (typeof input !== "string") return null;

  const s = input
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[″]/g, '"')
    .replace(/\s+/g, " ");

  if (!s) return null;

  // Feet (+ optional inches): 7', 7ft, 7 feet, 7'6, 7'6", 7' 6 1/2"
  const ftRe = new RegExp(
    `^(${NUM})\\s*(?:'|ft|feet)(?:\\s*(${NUM})\\s*(?:"|in|inches)?)?$`,
  );
  const ft = ftRe.exec(s);
  if (ft) {
    const feet = parseNumericToken(ft[1]!);
    if (feet == null) return null;
    let inches = 0;
    if (ft[2] != null) {
      const i = parseNumericToken(ft[2]);
      if (i == null) return null;
      inches = i;
    }
    return feet * 12 + inches;
  }

  // Inches with explicit marker
  const inRe = new RegExp(`^(${NUM})\\s*(?:"|in|inches)$`);
  const inMatch = inRe.exec(s);
  if (inMatch) {
    return parseNumericToken(inMatch[1]!);
  }

  // Metric
  const metRe = new RegExp(`^(${NUM})\\s*(mm|cm|m)$`);
  const met = metRe.exec(s);
  if (met) {
    const n = parseNumericToken(met[1]!);
    if (n == null) return null;
    const mm = met[2] === "mm" ? n : met[2] === "cm" ? n * 10 : n * 1000;
    return mm / MM_PER_INCH;
  }

  // Bare number — interpret in default unit
  const bareRe = new RegExp(`^(${NUM})$`);
  const bare = bareRe.exec(s);
  if (bare) {
    const n = parseNumericToken(bare[1]!);
    if (n == null) return null;
    return defaultUnit === "in" ? n : n / MM_PER_INCH;
  }

  return null;
}

// Zod schema factory — produces a schema that parses a length string to inches.
// Bounds are in inches.
export function lengthInchesSchema(opts: {
  defaultUnit: Unit;
  min?: number;
  max?: number;
  fieldName?: string;
}) {
  const { defaultUnit, min, max, fieldName = "Length" } = opts;
  return z
    .string()
    .transform((val, ctx) => {
      const inches = parseLengthToInches(val, defaultUnit);
      if (inches == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName}: could not parse "${val}"`,
        });
        return z.NEVER;
      }
      if (min != null && inches < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be at least ${min}"`,
        });
        return z.NEVER;
      }
      if (max != null && inches > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be at most ${max}"`,
        });
        return z.NEVER;
      }
      return inches;
    });
}

// Integer count schema — for things like bench count.
export function countSchema(opts: { min?: number; max?: number; fieldName?: string } = {}) {
  const { min = 1, max = 1000, fieldName = "Count" } = opts;
  return z
    .string()
    .transform((val, ctx) => {
      const n = Number(val.trim());
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName}: must be a whole number`,
        });
        return z.NEVER;
      }
      if (n < min || n > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName}: must be between ${min} and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });
}
