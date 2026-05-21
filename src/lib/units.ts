export type Unit = "in" | "mm";

const MM_PER_INCH = 25.4;

export function toInches(value: number, unit: Unit): number {
  return unit === "in" ? value : value / MM_PER_INCH;
}

export function fromInches(value: number, unit: Unit): number {
  return unit === "in" ? value : value * MM_PER_INCH;
}

// Format an inch value as a readable fraction: 12.5 -> "12 1/2""
// Rounds to nearest 1/16.
export function formatInches(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  const sixteenths = Math.round(frac * 16);

  if (sixteenths === 0) return `${sign}${whole}"`;
  if (sixteenths === 16) return `${sign}${whole + 1}"`;

  // reduce
  let num = sixteenths;
  let den = 16;
  while (num % 2 === 0 && den % 2 === 0) {
    num /= 2;
    den /= 2;
  }

  return whole === 0 ? `${sign}${num}/${den}"` : `${sign}${whole} ${num}/${den}"`;
}

export function formatMm(value: number): string {
  return `${Math.round(value)} mm`;
}

// Display an internal inch value in the user's preferred unit
export function formatLength(inches: number, unit: Unit): string {
  return unit === "in" ? formatInches(inches) : formatMm(fromInches(inches, "mm"));
}
