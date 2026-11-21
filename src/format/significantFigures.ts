/** Significant-figure rounding helpers that return either numbers or stable text. */
import { INVALID_NUMBER, finiteInput, sanitizeDigits, stripExponentPlus } from './internal';

/**
 * Rounds to the requested number of significant figures and returns a finite
 * number. Zero and non-finite inputs return `0`; digits are clamped to 1-15.
 * Uses native decimal rounding of the binary value, so `1.005` at three
 * figures is `1`, matching JavaScript's `toPrecision` behaviour.
 */
export function roundToSignificantFigures(value: number, significantDigits = 3): number {
  const finite = finiteInput(value);
  if (finite === null || finite === 0) return 0;
  const digits = sanitizeDigits(significantDigits, 3, 1, 15);
  const rounded = Number(finite.toPrecision(digits));
  return Number.isFinite(rounded) ? rounded : 0;
}

/**
 * Formats with significant figures while preserving trailing zeros (for
 * example `1.230`). Values whose exponent requires it are rendered in
 * normalised exponent form; NaN and infinities use the invalid marker.
 */
export function formatSignificantFigures(value: number, significantDigits = 3): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(significantDigits, 3, 1, 15);
  return stripExponentPlus(finite.toPrecision(digits));
}
