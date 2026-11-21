import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENERATOR_CONFIG,
  generateScenario,
  generateUniverse,
  generatorSummary,
} from '../generators/universeGenerator';
import type { CelestialBody } from '../types/celestial';

function fingerprint(bodies: CelestialBody[]): string {
  return bodies
    .map((body) => `${body.id}:${body.physical.position.x.toFixed(3)}:${body.physical.mass.toFixed(1)}`)
    .join('|');
}

describe('procedural universe generator', () => {
  it('is reproducible for a given seed', () => {
    const a = generateUniverse({ seed: 42, systemName: 'Test' });
    const b = generateUniverse({ seed: 42, systemName: 'Test' });
    expect(fingerprint(a.bodies)).toBe(fingerprint(b.bodies));
    expect(a.name).toBe(b.name);
  });

  it('produces different systems for different seeds', () => {
    const a = generateUniverse({ seed: 1 });
    const b = generateUniverse({ seed: 2 });
    expect(fingerprint(a.bodies)).not.toBe(fingerprint(b.bodies));
  });

  it('respects generator controls', () => {
    const universe = generateUniverse({
      seed: 7,
      starCount: 2,
      planetCount: 4,
      moonCount: 2,
      asteroidCount: 10,
      includeComet: false,
    });
    expect(universe.bodies.filter((body) => body.type === 'star')).toHaveLength(2);
    expect(universe.bodies.filter((body) => body.type === 'planet')).toHaveLength(4);
    expect(universe.bodies.filter((body) => body.type === 'moon')).toHaveLength(2);
    expect(universe.bodies.filter((body) => body.type === 'asteroid')).toHaveLength(10);
    expect(universe.bodies.some((body) => body.type === 'comet')).toBe(false);
  });

  it('creates coherent initial conditions', () => {
    const universe = generateUniverse({ seed: 99, planetCount: 3 });
    for (const body of universe.bodies) {
      expect(Number.isFinite(body.physical.mass)).toBe(true);
      expect(Number.isFinite(body.physical.position.x)).toBe(true);
      expect(Number.isFinite(body.physical.velocity.z)).toBe(true);
      expect(body.physical.mass).toBeGreaterThan(0);
    }
  });

  it('creates scenarios with camera configuration', () => {
    const scenario = generateScenario({ seed: 5 });
    expect(scenario.camera.suggestedDistance).toBeGreaterThan(0);
    expect(scenario.universe.bodies.length).toBeGreaterThan(0);
    expect(generatorSummary(DEFAULT_GENERATOR_CONFIG)).toContain('planets');
  });
});
