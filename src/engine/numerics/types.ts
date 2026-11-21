/**
 * Shared immutable value shapes for the numerics module family.
 *
 * Every function in this folder treats these shapes as read-only inputs and
 * returns fresh values; callers may safely freeze them.
 */

/** Row-major 3 × 3 matrix. Every entry is assumed finite. */
export type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

/** Dense row-major matrix. Rows are assumed to have equal, finite length. */
export type Matrix = readonly (readonly number[])[];

/** Dense numeric vector. Entries are assumed finite. */
export type NumericVector = readonly number[];
