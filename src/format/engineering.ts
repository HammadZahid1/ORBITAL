/** Engineering notation: exponents are always multiples of three. */
import { INVALID_NUMBER, finiteInput, sanitizeDigits, fixed } from './internal';

/**
 * Returns the largest multiple of three no greater than the base-10 exponent.
 * Zero and non-finite inputs return `0` so the result is always finite.
 */
export function engineeringExponent(value: number): number {
  const finite = finiteInput(value);
  if (finite === null || finite === 0) return 0;
  return Math.floor(Math.floor(Math.log10(Math.abs(finite))) / 3) * 3;
}

/**
 * Formats a value with a mantissa in `[1, 1000)` and an exponent divisible by
 * three. The mantissa carries `significantDigits` significant figures; a carry
 * to 1000 is folded into the next exponent. Non-finite inputs use `—`.
 */
export function formatEngineering(value: number, significantDigits = 4): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  if (finite === 0) return '0';

  const digits = sanitizeDigits(significantDigits, 4, 1, 15);
  let exponent = engineeringExponent(finite);
  let mantissa = finite / 10 ** exponent;
  const decimalsFor = (magnitude: number): number =>
    Math.max(0, digits - 1 - Math.floor(Math.log10(magnitude)));
  let text = fixed(mantissa, decimalsFor(Math.abs(mantissa)));

  if (Math.abs(Number(text)) >= 1000) {
    mantissa = Number(text) / 1000;
    exponent += 3;
    text = fixed(mantissa, decimalsFor(Math.abs(mantissa)));
  }
  if (Math.abs(Number(text)) < 1 && Number(text) !== 0) {
    mantissa = Number(text) * 1000;
    exponent -= 3;
    text = fixed(mantissa, decimalsFor(Math.abs(mantissa)));
  }
  return `${text}e${exponent}`;
}
