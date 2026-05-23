import { z } from "zod";

// Numeric feet+inches input. Both fields are numbers; either may be omitted (treated as 0).
// Combined value is computed as feet * 12 + inches and validated against optional bounds.
export type FeetInches = { feet: number; inches: number };

export function feetInchesSchema(opts: {
  min?: number; // inches
  max?: number; // inches
  fieldName?: string;
} = {}) {
  const { min, max, fieldName = "Length" } = opts;
  return z
    .object({
      feet: z
        .number({ invalid_type_error: `${fieldName} feet must be a number` })
        .finite()
        .min(0, `${fieldName} feet must be ≥ 0`),
      inches: z
        .number({ invalid_type_error: `${fieldName} inches must be a number` })
        .finite()
        .min(0, `${fieldName} inches must be ≥ 0`),
    })
    .transform((v, ctx) => {
      const total = v.feet * 12 + v.inches;
      if (min != null && total < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be at least ${min}"`,
        });
        return z.NEVER;
      }
      if (max != null && total > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldName} must be at most ${max}"`,
        });
        return z.NEVER;
      }
      return total;
    });
}

// Decompose total inches into { feet, inches } for displaying in split inputs.
export function splitFeetInches(totalInches: number): FeetInches {
  const sign = totalInches < 0 ? -1 : 1;
  const abs = Math.abs(totalInches);
  const feet = Math.floor(abs / 12);
  const inches = abs - feet * 12;
  return { feet: sign * feet, inches: sign * inches };
}

// Combine { feet, inches } back to total inches.
export function combineFeetInches(v: FeetInches): number {
  return v.feet * 12 + v.inches;
}

// Integer count schema — for things like bench count.
export function countSchema(opts: { min?: number; max?: number; fieldName?: string } = {}) {
  const { min = 1, max = 1000, fieldName = "Count" } = opts;
  return z
    .number({ invalid_type_error: `${fieldName} must be a number` })
    .int(`${fieldName} must be a whole number`)
    .min(min, `${fieldName} must be ≥ ${min}`)
    .max(max, `${fieldName} must be ≤ ${max}`);
}

// Plain non-negative inches schema for fields that only need a single number.
export function inchesSchema(opts: { min?: number; max?: number; fieldName?: string } = {}) {
  const { min = 0, max, fieldName = "Value" } = opts;
  let s = z
    .number({ invalid_type_error: `${fieldName} must be a number` })
    .finite()
    .min(min, `${fieldName} must be ≥ ${min}`);
  if (max != null) s = s.max(max, `${fieldName} must be ≤ ${max}`);
  return s;
}
