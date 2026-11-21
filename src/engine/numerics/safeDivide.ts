import { finiteOr } from '../numeric';

/**
 * Divides two numbers, returning a finite fallback for invalid operations.
 *
 * Assumptions:
 * - Division by zero, non-finite operands, or a non-finite quotient yields
 *   `fallback`.
 * - A non-finite `fallback` is coerced to `0` so the result is always finite.
 *
 * Unlike `safeMagnitude`, this protects the quotient rather than the divisor.
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  const safeFallback = finiteOr(fallback, 0);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return safeFallback;
  }
  return finiteOr(numerator / denominator, safeFallback);
}
