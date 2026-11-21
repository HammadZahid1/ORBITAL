import { describe, expect, it } from 'vitest';
import {
  bisectRoot,
  clampAngle,
  countSignificantDigits,
  cubicHermite,
  determinant3,
  exponentialSmoothing,
  goldenSectionMinimum,
  inverse3,
  linearInterpolate,
  logInterpolate,
  movingAverage,
  nearlyEqual,
  newtonRoot,
  resolveRootOptions,
  resolveSubdivisions,
  safeDivide,
  secantRoot,
  simpsonIntegral,
  solveLinearSystem,
  trapezoidalIntegral,
  wrapAngle,
  type Matrix,
  type Matrix3,
} from '../engine/numerics';

/** Small local helper for verifying matrix inverses; not part of the numerics API. */
function multiply3(a: Matrix3, b: Matrix3): Matrix3 {
  const row = (r: number): [number, number, number] => [
    a[r][0] * b[0][0] + a[r][1] * b[1][0] + a[r][2] * b[2][0],
    a[r][0] * b[0][1] + a[r][1] * b[1][1] + a[r][2] * b[2][1],
    a[r][0] * b[0][2] + a[r][1] * b[1][2] + a[r][2] * b[2][2],
  ];
  return [row(0), row(1), row(2)];
}

describe('scalar root finding and minimisation', () => {
  it('bisectRoot finds bracketed roots and honours endpoint roots', () => {
    const root = bisectRoot((x) => x * x - 2, 1, 2);
    expect(root).not.toBeNull();
    expect(root as number).toBeCloseTo(Math.SQRT2, 9);
    expect(bisectRoot((x) => x, 0, 5)).toBe(0);
    expect(bisectRoot((x) => x, -5, 0)).toBe(0);
    expect(bisectRoot((x) => x, 2, -1)).toBeCloseTo(0, 8);
  });

  it('bisectRoot rejects unbracketed, non-finite and invalid inputs', () => {
    expect(bisectRoot((x) => x * x + 1, -1, 1)).toBeNull();
    expect(bisectRoot(() => Number.NaN, -1, 1)).toBeNull();
    expect(bisectRoot((x) => x, Number.NaN, 1)).toBeNull();
    expect(bisectRoot((x) => x, 1, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('newtonRoot converges and rejects stationary or non-finite derivatives', () => {
    const root = newtonRoot((x) => x * x - 2, (x) => 2 * x, 1);
    expect(root).not.toBeNull();
    expect(root as number).toBeCloseTo(Math.SQRT2, 10);
    expect(newtonRoot((x) => x * x, (x) => 2 * x, 0)).toBe(0);
    expect(newtonRoot((x) => x * x + 1, (x) => 2 * x, 0)).toBeNull();
    expect(newtonRoot(() => Number.NaN, () => 1, 0)).toBeNull();
    expect(newtonRoot((x) => x, () => Number.POSITIVE_INFINITY, 1)).toBeNull();
  });

  it('secantRoot converges and rejects degenerate guesses', () => {
    const root = secantRoot((x) => x * x - 2, 1, 2);
    expect(root).not.toBeNull();
    expect(root as number).toBeCloseTo(Math.SQRT2, 9);
    expect(secantRoot(() => 1, 0, 1)).toBeNull();
    expect(secantRoot((x) => x, 3, 3)).toBeNull();
    expect(secantRoot((x) => x, Number.NaN, 1)).toBeNull();
    expect(secantRoot(() => Number.NaN, 0, 1)).toBeNull();
  });

  it('goldenSectionMinimum handles unimodal, degenerate and reversed intervals', () => {
    const minimum = goldenSectionMinimum((x) => (x - 1) ** 2 + 2, 0, 3);
    expect(minimum).not.toBeNull();
    expect(minimum as number).toBeCloseTo(1, 6);
    expect(goldenSectionMinimum((x) => x * x, 2, 2)).toBe(2);
    expect(goldenSectionMinimum((x) => x * x, 3, -3)).toBeCloseTo(0, 6);
    expect(goldenSectionMinimum(() => Number.NaN, 0, 1)).toBeNull();
    expect(goldenSectionMinimum((x) => x, Number.NaN, 1)).toBeNull();
  });

  it('resolveRootOptions falls back to finite defaults', () => {
    expect(resolveRootOptions()).toEqual({ tolerance: 1e-9, maxIterations: 100 });
    expect(resolveRootOptions({ tolerance: -1, maxIterations: Number.NaN })).toEqual({
      tolerance: 1e-9,
      maxIterations: 100,
    });
    expect(resolveRootOptions({ tolerance: 1e-4, maxIterations: 2.8 })).toEqual({
      tolerance: 1e-4,
      maxIterations: 2,
    });
  });
});

describe('composite quadrature', () => {
  it('integrates polynomials with the expected accuracy', () => {
    const trapezoid = trapezoidalIntegral((x) => x * x, 0, 1, 1000);
    expect(trapezoid).not.toBeNull();
    expect(trapezoid as number).toBeCloseTo(1 / 3, 6);

    const simpson = simpsonIntegral((x) => x ** 3, 0, 2, 100);
    expect(simpson).not.toBeNull();
    expect(simpson as number).toBeCloseTo(4, 12);
    expect(simpsonIntegral(() => 7, -2, 3, 4)).toBeCloseTo(35, 12);
  });

  it('rejects non-finite data and normalises subdivision counts', () => {
    expect(trapezoidalIntegral(() => Number.NaN, 0, 1)).toBeNull();
    expect(trapezoidalIntegral((x) => x, 0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(simpsonIntegral((x) => 1 / x, 0, 1, 10)).toBeNull();

    expect(resolveSubdivisions(undefined)).toBe(128);
    expect(resolveSubdivisions(Number.NaN)).toBe(128);
    expect(resolveSubdivisions(5, true)).toBe(6);
    expect(simpsonIntegral((x) => x ** 3, 0, 2, 5)).toBeCloseTo(4, 12);
  });
});

describe('small linear algebra', () => {
  it('solveLinearSystem solves a 3x3 system without mutating inputs', () => {
    const matrix: Matrix = [
      [2, 1, -1],
      [-3, -1, 2],
      [-2, 1, 2],
    ];
    const rhs = [8, -11, -3];
    const snapshot = matrix.map((row) => [...row]);

    const solution = solveLinearSystem(matrix, rhs);
    expect(solution).not.toBeNull();
    const expected = [2, 3, -1];
    (solution as number[]).forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
    expect(matrix).toEqual(snapshot);
    expect(rhs).toEqual([8, -11, -3]);
  });

  it('solveLinearSystem rejects singular, malformed and non-finite systems', () => {
    expect(solveLinearSystem(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6],
    )).toBeNull();
    expect(solveLinearSystem([[1, 2]], [3])).toBeNull();
    expect(solveLinearSystem(
      [
        [1, Number.NaN],
        [0, 1],
      ],
      [1, 1],
    )).toBeNull();
    expect(solveLinearSystem([], [])).toEqual([]);
  });

  it('determinant3 computes cofactor determinants and sanitises non-finite inputs', () => {
    const matrix: Matrix3 = [
      [6, 1, 1],
      [4, -2, 5],
      [2, 8, 7],
    ];
    expect(determinant3(matrix)).toBeCloseTo(-306, 10);
    expect(determinant3([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])).toBe(1);
    expect(determinant3([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])).toBeCloseTo(0, 10);
    expect(determinant3([
      [Number.NaN, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])).toBe(0);
  });

  it('inverse3 inverts matrices and rejects singular or non-finite inputs', () => {
    const matrix: Matrix3 = [
      [4, 7, 2],
      [3, 5, 1],
      [2, 1, 3],
    ];
    const inverse = inverse3(matrix);
    expect(inverse).not.toBeNull();
    const product = multiply3(matrix, inverse as Matrix3);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        expect(product[row][column]).toBeCloseTo(row === column ? 1 : 0, 10);
      }
    }

    expect(inverse3([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ])).toEqual([
      [0.5, 0, 0],
      [0, 1 / 3, 0],
      [0, 0, 0.25],
    ]);
    expect(inverse3([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])).toBeNull();
    expect(inverse3([
      [Number.NaN, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])).toBeNull();
  });
});

describe('interpolation', () => {
  it('linearInterpolate interpolates, extrapolates and sanitises inputs', () => {
    expect(linearInterpolate(0, 10, 0.25)).toBe(2.5);
    expect(linearInterpolate(0, 10, 1.5)).toBe(15);
    expect(linearInterpolate(Number.NaN, 4, 0.5)).toBe(2);
    expect(linearInterpolate(0, 4, Number.NaN)).toBe(0);
  });

  it('cubicHermite matches endpoints and slopes and clamps t', () => {
    const curve = (t: number) => cubicHermite(0, 1, 2, 3, t);
    expect(curve(0)).toBe(0);
    expect(curve(1)).toBe(2);

    const delta = 1e-5;
    expect((curve(delta) - curve(0)) / delta).toBeCloseTo(1, 4);
    expect(curve(-1)).toBe(0);
    expect(curve(2)).toBe(2);
    expect(cubicHermite(Number.NaN, 0, 5, 0, 1)).toBe(5);
  });

  it('logInterpolate interpolates geometrically and guards invalid endpoints', () => {
    expect(logInterpolate(1, 100, 0.5)).toBeCloseTo(10, 10);
    expect(logInterpolate(2, 8, 0)).toBeCloseTo(2, 10);
    expect(logInterpolate(2, 8, 1)).toBeCloseTo(8, 10);
    expect(logInterpolate(2, 8, 5)).toBeCloseTo(8, 10);
    expect(logInterpolate(0, 8, 0.5)).toBe(0);
    expect(logInterpolate(-2, 8, 0.5)).toBe(0);
    expect(logInterpolate(Number.NaN, 8, 0.5)).toBe(0);
  });
});

describe('series smoothing', () => {
  it('movingAverage uses causal partial windows and sanitises samples', () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(movingAverage([1, 2, 3, 4], 10)).toEqual([1, 1.5, 2, 2.5]);
    expect(movingAverage([1, Number.NaN, 3], 2)).toEqual([1, 0.5, 1.5]);
    expect(movingAverage([1, 2, 3], 0)).toEqual([1, 2, 3]);
    expect(movingAverage([], 3)).toEqual([]);
  });

  it('exponentialSmoothing honours alpha, initial state and invalid input', () => {
    expect(exponentialSmoothing([10, 20, 30], 0.5, 10)).toEqual([10, 15, 22.5]);
    expect(exponentialSmoothing([10, 20, 30], 0, 5)).toEqual([5, 5, 5]);
    expect(exponentialSmoothing([Number.NaN], 1, 5)).toEqual([0]);
    expect(exponentialSmoothing([10], Number.NaN, 5)).toEqual([5]);
    expect(exponentialSmoothing([], 0.5)).toEqual([]);
  });
});

describe('angle helpers', () => {
  it('clampAngle clamps, swaps reversed bounds and sanitises inputs', () => {
    expect(clampAngle(5)).toBeCloseTo(Math.PI, 12);
    expect(clampAngle(-5)).toBeCloseTo(-Math.PI, 12);
    expect(clampAngle(2, -1, 1)).toBe(1);
    expect(clampAngle(2, 1, -1)).toBe(1);
    expect(clampAngle(Number.NaN)).toBe(0);
  });

  it('wrapAngle normalises to [-pi, pi) and supports custom periods', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI)).toBeCloseTo(-Math.PI, 12);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(-Math.PI, 12);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(-Math.PI, 12);
    expect(wrapAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 12);
    expect(wrapAngle(10, 4)).toBeCloseTo(-2, 12);
    expect(wrapAngle(Number.NaN)).toBe(0);
  });
});

describe('scalar comparison helpers', () => {
  it('countSignificantDigits handles integers, decimals and non-finite values', () => {
    expect(countSignificantDigits(12345)).toBe(5);
    expect(countSignificantDigits(0.00123)).toBe(3);
    expect(countSignificantDigits(1000)).toBe(1);
    expect(countSignificantDigits(-12.34)).toBe(4);
    expect(countSignificantDigits(0)).toBe(0);
    expect(countSignificantDigits(Number.NaN)).toBe(0);
    expect(countSignificantDigits(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('nearlyEqual applies relative, absolute and non-finite rules', () => {
    expect(nearlyEqual(1, 1 + 1e-10)).toBe(true);
    expect(nearlyEqual(0, 1e-13)).toBe(true);
    expect(nearlyEqual(1, 1.001)).toBe(false);
    expect(nearlyEqual(1e9, 1e9 + 10)).toBe(false);
    expect(nearlyEqual(1, 1 + 1e-10, Number.NaN, Number.NaN)).toBe(true);
    expect(nearlyEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
    expect(nearlyEqual(Number.NaN, Number.NaN)).toBe(false);
  });

  it('safeDivide returns finite fallbacks for invalid division', () => {
    expect(safeDivide(6, 3)).toBe(2);
    expect(safeDivide(1, 0)).toBe(0);
    expect(safeDivide(1, 0, -1)).toBe(-1);
    expect(safeDivide(Number.NaN, 2, 7)).toBe(7);
    expect(safeDivide(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 7)).toBe(7);
    expect(safeDivide(1, Number.POSITIVE_INFINITY)).toBe(0);
    expect(safeDivide(1, 0, Number.NaN)).toBe(0);
  });
});
