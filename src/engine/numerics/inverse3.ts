import { determinant3 } from './determinant3';
import type { Matrix3 } from './types';

/**
 * Inverts a row-major 3 × 3 matrix using the adjugate divided by the determinant.
 *
 * Assumptions:
 * - The matrix is a 3 × 3 tuple of finite numbers in row-major order.
 * - The matrix is non-singular: `|det| <= 8 * eps * max|A|³` is treated as
 *   singular to avoid amplifying round-off.
 * - Non-finite inputs or a non-finite intermediate result return `null`.
 *
 * Returns a fresh row-major matrix; the input is never modified.
 */
export function inverse3(matrix: Matrix3): Matrix3 | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  const entries = [a, b, c, d, e, f, g, h, i];
  if (!entries.every(Number.isFinite)) return null;

  const determinant = determinant3(matrix);
  const scale = Math.max(...entries.map(Math.abs));
  const scaleCubed = scale ** 3;
  const threshold = Number.EPSILON * (Number.isFinite(scaleCubed) ? scaleCubed : Number.MAX_VALUE) * 8;
  if (determinant === 0 || Math.abs(determinant) <= threshold) return null;

  // Cofactors of A; the inverse is their transpose divided by det(A).
  const c00 = e * i - f * h;
  const c01 = f * g - d * i;
  const c02 = d * h - e * g;
  const c10 = c * h - b * i;
  const c11 = a * i - c * g;
  const c12 = b * g - a * h;
  const c20 = b * f - c * e;
  const c21 = c * d - a * f;
  const c22 = a * e - b * d;

  const inverse: Matrix3 = [
    [c00 / determinant, c10 / determinant, c20 / determinant],
    [c01 / determinant, c11 / determinant, c21 / determinant],
    [c02 / determinant, c12 / determinant, c22 / determinant],
  ];
  return inverse.every((row) => row.every(Number.isFinite)) ? inverse : null;
}
