/** Compact short-scale count formatting (K/M/B/T). */
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';

interface CompactSuffix {
  readonly threshold: number;
  readonly symbol: string;
}

/** Suffixes ordered from largest to smallest threshold. */
const SUFFIXES: readonly CompactSuffix[] = Object.freeze([
  { threshold: 1e12, symbol: 'T' },
  { threshold: 1e9, symbol: 'B' },
  { threshold: 1e6, symbol: 'M' },
  { threshold: 1e3, symbol: 'K' },
]);

/** Scale and suffix selected for a finite count; index -1 means no suffix. */
export interface CompactScale {
  readonly divisor: number;
  readonly symbol: string;
}

/**
 * Selects the short-scale suffix for `count`. Non-finite values fall back to a
 * divisor of one and an empty suffix; inputs are never modified.
 */
export function compactScale(count: number): CompactScale {
  const finite = finiteInput(count);
  if (finite === null) return { divisor: 1, symbol: '' };
  const magnitude = Math.abs(finite);
  const index = SUFFIXES.findIndex((suffix) => magnitude >= suffix.threshold);
  return index < 0
    ? { divisor: 1, symbol: '' }
    : { divisor: SUFFIXES[index].threshold, symbol: SUFFIXES[index].symbol };
}

/**
 * Formats counts such as `999`, `1.2K` or `2.5M`. A rounded result of 1000 at
 * one scale is promoted to the next suffix. Digits are clamped to 0-3 and
 * non-finite values return `—`.
 */
export function formatCompactCount(count: number, fractionDigits = 1): string {
  const finite = finiteInput(count);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 1, 0, 3);
  let { divisor, symbol } = compactScale(finite);
  let index = SUFFIXES.findIndex((suffix) => suffix.threshold === divisor);
  let text = fixed(finite / divisor, digits);

  if (!symbol) {
    const rounded = fixed(finite, 0);
    if (Math.abs(Number(rounded)) < 1000) return rounded;
    divisor = SUFFIXES[SUFFIXES.length - 1].threshold;
    symbol = SUFFIXES[SUFFIXES.length - 1].symbol;
    index = SUFFIXES.length - 1;
    text = fixed(finite / divisor, digits);
  }

  if (Math.abs(Number(text)) >= 1000 && index > 0) {
    index -= 1;
    divisor = SUFFIXES[index].threshold;
    symbol = SUFFIXES[index].symbol;
    text = fixed(finite / divisor, digits);
  }
  return `${text}${symbol}`;
}
