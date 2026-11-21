import { describe, expect, it } from 'vitest';
import { C, EARTH_MASS, EARTH_RADIUS, SOLAR_MASS, AU } from '../engine/numeric';
import {
  escapeSpeed,
  hillRadius,
  relativisticBeta,
  rocheLimit,
  schwarzschildRadius,
  surfaceGravity,
} from '../engine/physics/limits';

describe('astrophysical limit helpers', () => {
  it('approximates terrestrial gravity and escape speed', () => {
    expect(surfaceGravity(EARTH_MASS, EARTH_RADIUS)).toBeGreaterThan(9.7);
    expect(surfaceGravity(EARTH_MASS, EARTH_RADIUS)).toBeLessThan(10);
    expect(escapeSpeed(EARTH_MASS, EARTH_RADIUS)).toBeGreaterThan(11_000);
    expect(escapeSpeed(EARTH_MASS, EARTH_RADIUS)).toBeLessThan(11_400);
  });

  it('computes a Schwarzschild radius consistent with c', () => {
    const radius = schwarzschildRadius(SOLAR_MASS);
    expect(radius).toBeGreaterThan(2900);
    expect(radius).toBeLessThan(3000);
    expect(escapeSpeed(SOLAR_MASS, radius)).toBeCloseTo(C, -4);
  });

  it('scales the Hill sphere with mass ratio', () => {
    const radius = hillRadius(EARTH_MASS, SOLAR_MASS, AU);
    expect(radius).toBeGreaterThan(1e9);
    expect(radius).toBeLessThan(2e9);
    expect(hillRadius(0, SOLAR_MASS, AU)).toBe(0);
  });

  it('computes Roche limits and clamps relativistic beta', () => {
    const roche = rocheLimit(EARTH_RADIUS, 5500, 3000);
    expect(roche).toBeGreaterThan(EARTH_RADIUS);
    expect(rocheLimit(1, 0, 1)).toBe(0);
    expect(relativisticBeta(C / 2)).toBeCloseTo(0.5, 10);
    expect(relativisticBeta(C * 4)).toBe(1);
  });
});
