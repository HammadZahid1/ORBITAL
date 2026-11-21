import { describe, expect, it } from 'vitest';
import {
  add3,
  cross3,
  distance3,
  dot3,
  length3,
  lerp3,
  negate3,
  normalize3,
  scale3,
  sub3,
  vec3,
} from '../engine/vector';

describe('three-dimensional vector operations', () => {
  it('adds and subtracts component-wise', () => {
    expect(add3(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual(vec3(5, 7, 9));
    expect(sub3(vec3(4, 5, 6), vec3(1, 2, 3))).toEqual(vec3(3, 3, 3));
  });

  it('scales and negates', () => {
    expect(scale3(vec3(1, -2, 3), 2.5)).toEqual(vec3(2.5, -5, 7.5));
    expect(negate3(vec3(1, -2, 3))).toEqual(vec3(-1, 2, -3));
  });

  it('computes dot and cross products', () => {
    expect(dot3(vec3(1, 2, 3), vec3(4, -5, 6))).toBe(12);
    expect(cross3(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual(vec3(0, 0, 1));
  });

  it('computes length, distance and normalisation', () => {
    expect(length3(vec3(3, 4, 0))).toBe(5);
    expect(distance3(vec3(0, 0, 0), vec3(3, 4, 12))).toBe(13);
    const unit = normalize3(vec3(0, 5, 0));
    expect(unit).toEqual(vec3(0, 1, 0));
    expect(normalize3(vec3())).toEqual(vec3());
  });

  it('interpolates linearly', () => {
    expect(lerp3(vec3(0, 0, 0), vec3(10, 20, 30), 0.25)).toEqual(vec3(2.5, 5, 7.5));
  });

  it('preserves orthogonality of a normalized cross product', () => {
    const a = vec3(2, -1, 3);
    const b = vec3(0, 4, 1);
    expect(dot3(a, cross3(a, b))).toBeCloseTo(0, 10);
    expect(dot3(b, cross3(a, b))).toBeCloseTo(0, 10);
  });
});
