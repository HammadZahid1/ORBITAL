/** Vector formatting for three-component physics values. */
import type { Vec3 } from '../types/vector';
import { INVALID_NUMBER, finiteInput, fixed, sanitizeDigits } from './internal';
import { formatScientific } from './scientific';

/** Options for {@link formatVector}. */
export interface VectorFormatOptions {
  /** Decimal places for fixed notation (default 2, clamped to 0-6). */
  digits?: number;
  /** Optional label appended to the whole tuple, e.g. `m/s`. */
  unit?: string;
  /** Use normalised scientific notation for each component; default `fixed`. */
  notation?: 'fixed' | 'scientific';
}

function componentText(value: number, digits: number, notation: 'fixed' | 'scientific'): string {
  const finite = finiteInput(value);
  if (finite === null) return INVALID_NUMBER;
  return notation === 'scientific' ? formatScientific(finite, digits) : fixed(finite, digits);
}

/**
 * Formats a vector as `(x, y, z)` with optional unit suffix. Individual
 * non-finite components become `—` without affecting the others; a missing
 * vector is treated as three invalid components. The input is never mutated.
 */
export function formatVector(vector: Readonly<Vec3>, options: VectorFormatOptions = {}): string {
  const digits = sanitizeDigits(options.digits, 2, 0, 6);
  const notation = options.notation === 'scientific' ? 'scientific' : 'fixed';
  const components = [vector?.x, vector?.y, vector?.z].map((value) =>
    componentText(value as number, digits, notation),
  );
  const suffix = options.unit ? ` ${options.unit}` : '';
  return `(${components.join(', ')})${suffix}`;
}

/**
 * Returns the Euclidean magnitude of a vector as fixed text. Any non-finite
 * component or non-finite magnitude yields `—`.
 */
export function formatVectorMagnitude(vector: Readonly<Vec3>, fractionDigits = 2): string {
  const finite = finiteInput(vector?.x);
  const finiteY = finiteInput(vector?.y);
  const finiteZ = finiteInput(vector?.z);
  if (finite === null || finiteY === null || finiteZ === null) return INVALID_NUMBER;
  const magnitude = Math.hypot(finite, finiteY, finiteZ);
  const checked = finiteInput(magnitude);
  if (checked === null) return INVALID_NUMBER;
  return fixed(checked, sanitizeDigits(fractionDigits, 2, 0, 6));
}
