/** Private helpers shared by the public format modules; not re-exported by the barrel. */
import { clamp, finiteOr } from '../engine/numeric';

/** Text used when a value cannot be represented as a finite number. */
export const INVALID_NUMBER = '—';

/**
 * Sanitises an optional digit count into a rounded integer within inclusive bounds.
 * Non-finite or missing input falls back to `fallback`; no argument is modified.
 */
export function sanitizeDigits(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  return Math.round(clamp(finiteOr(value ?? fallback, fallback), min, max));
}

/** Returns the number when it is finite, otherwise `null` so callers can short-circuit. */
export function finiteInput(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Formats with a fixed decimal count, normalising negative zero to positive zero. */
export function fixed(value: number, digits: number): string {
  const finite = finiteOr(value, 0);
  return (Object.is(finite, -0) ? 0 : finite).toFixed(digits);
}

/** Removes the plus sign from exponent notation (`1e+3` becomes `1e3`). */
export function stripExponentPlus(text: string): string {
  return text.replace('e+', 'e');
}

/** Inserts en-US thousands separators into a plain integer string. */
export function groupInteger(text: string): string {
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
