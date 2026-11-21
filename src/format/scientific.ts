/**
 * Normalised scientific notation (`m × 10ⁿ`). Unlike the legacy
 * `engine/numeric.formatScientific` presentation helper, this formatter never
 * switches to fixed-point notation, so exponents are always explicit.
 */
import { INVALID_NUMBER, finiteInput, sanitizeDigits, stripExponentPlus } from './internal';

/** Rounded mantissa and base-10 exponent of a value. */
export interface ScientificParts {
  readonly mantissa: number;
  readonly exponent: number;
}

/**
 * Returns the rounded mantissa and exponent of `value`. Zero (including -0)
 * and non-finite inputs map to `{ mantissa: 0, exponent: 0 }`.
 */
export function scientificParts(value: number, fractionDigits = 3): ScientificParts {
  const finite = finiteInput(value);
  if (finite === null || finite === 0) return { mantissa: 0, exponent: 0 };
  const digits = sanitizeDigits(fractionDigits, 3, 0, 12);
  const [mantissa, exponent] = finite.toExponential(digits).split('e');
  return { mantissa: Number(mantissa), exponent: Number(exponent) };
}

/**
 * Formats a value as signed mantissa followed by `e` and the shortest exponent
 * form. Zero renders as `0`; NaN and infinities render as the invalid marker.
 */
export function formatScientific(value: number, fractionDigits = 3): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  if (finite === 0) return '0';
  const digits = sanitizeDigits(fractionDigits, 3, 0, 12);
  return stripExponentPlus(finite.toExponential(digits));
}
