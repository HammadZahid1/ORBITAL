import { finiteOr } from '../numeric';
import type { Matrix3 } from './types';

/**
 * Computes the determinant of a row-major 3 × 3 matrix by cofactor expansion.
 *
 * Assumptions:
 * - The matrix is a 3 × 3 tuple of finite numbers in row-major order.
 * - Non-finite inputs, or an intermediate overflow, produce `0` so the result
 *   remains finite; callers should validate inputs when that fallback matters.
 *
 * The input matrix is read-only and is never modified.
 */
export function determinant3(matrix: Matrix3): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  if (![a, b, c, d, e, f, g, h, i].every(Number.isFinite)) return 0;

  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return finiteOr(determinant, 0);
}
