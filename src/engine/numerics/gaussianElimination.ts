import type { Matrix, NumericVector } from './types';

/**
 * Solves a small dense square linear system `A x = b` by Gaussian elimination
 * with partial pivoting.
 *
 * Assumptions:
 * - `matrix` is square, `rhs.length === matrix.length`, and every entry is finite.
 * - A pivot whose magnitude is below `8 * eps * size * max|A|` is treated as
 *   singular; the system must therefore be reasonably well conditioned.
 * - Empty systems are valid and produce an empty solution vector.
 *
 * Returns `null` for malformed, non-finite, or singular systems. The inputs are
 * copied before elimination and are never modified.
 */
export function solveLinearSystem(matrix: Matrix, rhs: NumericVector): number[] | null {
  const size = rhs.length;
  if (size === 0) return [];
  if (matrix.length !== size) return null;

  const a: number[][] = [];
  const b: number[] = [];
  let scale = 0;

  for (let row = 0; row < size; row += 1) {
    const source = matrix[row];
    if (!source || source.length !== size) return null;

    const copy: number[] = [];
    for (let column = 0; column < size; column += 1) {
      const value = source[column];
      if (!Number.isFinite(value)) return null;
      copy.push(value);
      scale = Math.max(scale, Math.abs(value));
    }

    const rightHandSide = rhs[row];
    if (!Number.isFinite(rightHandSide)) return null;
    a.push(copy);
    b.push(rightHandSide);
  }

  const pivotTolerance = Number.EPSILON * scale * size * 8;

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    let best = Math.abs(a[column][column]);
    for (let row = column + 1; row < size; row += 1) {
      const candidate = Math.abs(a[row][column]);
      if (candidate > best) {
        best = candidate;
        pivotRow = row;
      }
    }
    if (best <= pivotTolerance) return null;

    if (pivotRow !== column) {
      [a[column], a[pivotRow]] = [a[pivotRow], a[column]];
      [b[column], b[pivotRow]] = [b[pivotRow], b[column]];
    }

    const pivot = a[column][column];
    for (let row = column + 1; row < size; row += 1) {
      const factor = a[row][column] / pivot;
      if (!Number.isFinite(factor)) return null;
      a[row][column] = 0;

      for (let target = column + 1; target < size; target += 1) {
        const updated = a[row][target] - factor * a[column][target];
        if (!Number.isFinite(updated)) return null;
        a[row][target] = updated;
      }

      const updatedRhs = b[row] - factor * b[column];
      if (!Number.isFinite(updatedRhs)) return null;
      b[row] = updatedRhs;
    }
  }

  const solution = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = b[row];
    for (let column = row + 1; column < size; column += 1) {
      sum -= a[row][column] * solution[column];
    }
    if (!Number.isFinite(sum)) return null;

    const pivot = a[row][row];
    if (!Number.isFinite(pivot) || pivot === 0) return null;
    const value = sum / pivot;
    if (!Number.isFinite(value)) return null;
    solution[row] = value;
  }

  return solution;
}
