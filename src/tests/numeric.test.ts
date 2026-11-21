import { describe, expect, it } from 'vitest';
import {
  AU,
  C,
  DAY,
  G,
  SOLAR_MASS,
  clamp,
  createRandom,
  finiteOr,
  formatDuration,
  hashString,
  safeMagnitude,
} from '../engine/numeric';

describe('numerical helpers and constants', () => {
  it('exposes coherent physical constants', () => {
    expect(G).toBeCloseTo(6.6743e-11, 16);
    expect(AU).toBe(1.495978707e11);
    expect(SOLAR_MASS).toBeGreaterThan(1e30);
    expect(C).toBe(299792458);
    expect(DAY).toBe(86400);
  });

  it('clamps and sanitises non-finite values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(finiteOr(Number.NaN, 42)).toBe(42);
    expect(finiteOr(Infinity, 42)).toBe(42);
    expect(finiteOr(7, 42)).toBe(7);
  });

  it('keeps a minimum magnitude without changing sign', () => {
    expect(safeMagnitude(0, 0.1)).toBe(0.1);
    expect(safeMagnitude(-0.01, 0.1)).toBe(-0.1);
    expect(safeMagnitude(-3, 0.1)).toBe(-3);
  });

  it('produces deterministic seeds and reproducible random streams', () => {
    expect(hashString('orbital')).toBe(hashString('orbital'));
    expect(hashString('orbital')).not.toBe(hashString('gravity'));
    const a = createRandom(1234);
    const b = createRandom(1234);
    const first = Array.from({ length: 8 }, () => a());
    const second = Array.from({ length: 8 }, () => b());
    expect(first).toEqual(second);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('formats simulation durations', () => {
    expect(formatDuration(30)).toBe('30.0 s');
    expect(formatDuration(7200)).toBe('2.00 h');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});
