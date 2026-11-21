/** SI prefix selection and prefix-scaled number formatting. */
import { clamp } from '../engine/numeric';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';

/** One SI prefix and its power-of-ten exponent. */
export interface SiPrefix {
  readonly exponent: number;
  readonly symbol: string;
}

/** Frozen quecto-to-quetta prefix table (exponents -30 to 30 in steps of three). */
export const SI_PREFIXES: readonly SiPrefix[] = Object.freeze(
  [
    [-30, 'q'],
    [-27, 'r'],
    [-24, 'y'],
    [-21, 'z'],
    [-18, 'a'],
    [-15, 'f'],
    [-12, 'p'],
    [-9, 'n'],
    [-6, 'µ'],
    [-3, 'm'],
    [0, ''],
    [3, 'k'],
    [6, 'M'],
    [9, 'G'],
    [12, 'T'],
    [15, 'P'],
    [18, 'E'],
    [21, 'Z'],
    [24, 'Y'],
    [27, 'R'],
    [30, 'Q'],
  ].map(([exponent, symbol]) => Object.freeze({ exponent: exponent as number, symbol: symbol as string })),
);

const BASE_INDEX = 10;
const LAST_INDEX = SI_PREFIXES.length - 1;

/**
 * Chooses the prefix whose exponent keeps a magnitude in `[1, 1000)`. Values
 * beyond the table are clamped to the largest or smallest prefix; zero and
 * non-finite inputs select the unprefixed base entry.
 */
export function siPrefixFor(value: number): SiPrefix {
  const finite = finiteInput(value);
  if (finite === null || finite === 0) return SI_PREFIXES[BASE_INDEX];

  const magnitude = Math.abs(finite);
  const log10 = Math.log10(magnitude);
  let index = Number.isFinite(log10)
    ? Math.round(clamp(BASE_INDEX + Math.floor(Math.floor(log10) / 3), 0, LAST_INDEX))
    : BASE_INDEX;

  while (index < LAST_INDEX && magnitude / 10 ** SI_PREFIXES[index].exponent >= 1000) index += 1;
  while (index > 0 && magnitude / 10 ** SI_PREFIXES[index].exponent < 1) index -= 1;
  return SI_PREFIXES[index];
}

/** Returns the prefix symbol selected for `value`. */
export function siPrefixSymbol(value: number): string {
  return siPrefixFor(value).symbol;
}

/** Scales a finite value by the selected prefix and returns both results. */
export function scaleBySiPrefix(value: number): { readonly scaled: number; readonly prefix: SiPrefix } {
  const finite = finiteInput(value);
  if (finite === null) return { scaled: 0, prefix: SI_PREFIXES[BASE_INDEX] };
  const prefix = siPrefixFor(finite);
  return { scaled: finite / 10 ** prefix.exponent, prefix };
}

/**
 * Formats a value with its SI prefix followed by `unit`. Zero renders with the
 * unprefixed unit and the requested number of decimals; non-finite values use
 * the invalid marker. Digits are clamped to 0-6.
 */
export function formatWithSiPrefix(value: number, unit = '', fractionDigits = 2): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  const digits = sanitizeDigits(fractionDigits, 2, 0, 6);
  const { scaled, prefix } = scaleBySiPrefix(finite);
  const label = `${prefix.symbol}${unit}`;
  const text = fixed(scaled, digits);
  return label ? `${text} ${label}` : text;
}
