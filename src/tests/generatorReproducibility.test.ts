import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENERATOR_CONFIG,
  generateScenario,
  generateUniverse,
  generatorSummary,
  type GeneratorConfig,
} from '../generators/universeGenerator';
import { calculateOrbitalElements, type OrbitalElements } from '../engine/orbits/orbital';
import { worldFromBodies } from '../engine/physics/world';
import { validateUniverseShape } from '../storage/schema';
import type { CelestialBody } from '../types/celestial';

function physicalState(bodies: CelestialBody[]) {
  return bodies.map((body) => ({
    id: body.id,
    type: body.type,
    parentId: body.parentId,
    mass: body.physical.mass,
    radius: body.physical.radius,
    position: body.physical.position,
    velocity: body.physical.velocity,
    visual: body.visual,
  }));
}

describe('generator reproducibility and configuration', () => {
  it('reproduces the complete physical and visual state for a seed', () => {
    const config = {
      seed: 1234,
      systemName: 'Reproducible',
      planetCount: 3,
      moonCount: 2,
      asteroidCount: 5,
      includeComet: true,
    };
    const a = generateUniverse(config);
    const b = generateUniverse(config);

    expect(physicalState(a.bodies)).toEqual(physicalState(b.bodies));
    expect(a.settings).toEqual(b.settings);
    expect(a.tags).toEqual(b.tags);
    expect(a.description).toBe(b.description);
    // Universe identifiers and timestamps are intentionally fresh per call.
    expect(a.id).not.toBe(b.id);
    expect(validateUniverseShape(a)).toBe(true);
  });

  it('uses the system name as part of the seeded random stream', () => {
    const alpha = generateUniverse({ seed: 7, systemName: 'Alpha', planetCount: 4 });
    const beta = generateUniverse({ seed: 7, systemName: 'Beta', planetCount: 4 });
    const planetMasses = (universe: typeof alpha) =>
      universe.bodies.filter((body) => body.type === 'planet').map((body) => body.physical.mass);
    expect(planetMasses(alpha)).not.toEqual(planetMasses(beta));
    expect(generateUniverse({ seed: 7, systemName: 'Alpha', planetCount: 4 }).bodies[1].physical.mass).toBeCloseTo(
      alpha.bodies[1].physical.mass,
      6,
    );
  });

  it('changes orbital shapes with the variation setting', () => {
    const options = {
      seed: 31,
      systemName: 'Variation',
      planetCount: 8,
      moonCount: 0,
      asteroidCount: 0,
      includeComet: false,
    };
    const elementsFor = (variation: 'calm' | 'chaotic') => {
      const universe = generateUniverse({ ...options, variation });
      const world = worldFromBodies(universe.bodies, { G: universe.settings.G, softening: 0 });
      return universe.bodies
        .map((_body, index) => calculateOrbitalElements(world, index, 0))
        .filter((elements): elements is OrbitalElements => elements !== null && elements.isBound);
    };
    const calm = elementsFor('calm');
    const chaotic = elementsFor('chaotic');
    expect(calm.length).toBeGreaterThan(2);
    expect(chaotic.length).toBeGreaterThan(2);

    const maxEccentricity = (elements: Array<NonNullable<ReturnType<typeof calculateOrbitalElements>>>) =>
      Math.max(...elements.map((item) => item.eccentricity));
    const maxInclination = (elements: Array<NonNullable<ReturnType<typeof calculateOrbitalElements>>>) =>
      Math.max(...elements.map((item) => item.inclination));

    expect(maxEccentricity(chaotic)).toBeGreaterThan(maxEccentricity(calm) * 2);
    expect(maxInclination(chaotic)).toBeGreaterThan(maxInclination(calm) + 0.05);
  });

  it('clamps out-of-range counts and remains a valid universe', () => {
    const universe = generateUniverse({
      seed: 1,
      starCount: 99,
      planetCount: -5,
      moonCount: 1000,
      asteroidCount: 1000,
      includeComet: false,
    });
    expect(universe.bodies.filter((body) => body.type === 'star')).toHaveLength(3);
    expect(universe.bodies.filter((body) => body.type === 'planet')).toHaveLength(0);
    expect(universe.bodies.filter((body) => body.type === 'moon')).toHaveLength(0);
    expect(universe.bodies.filter((body) => body.type === 'asteroid')).toHaveLength(400);
    expect(universe.bodies.some((body) => body.type === 'comet')).toBe(false);
    expect(new Set(universe.bodies.map((body) => body.id)).size).toBe(universe.bodies.length);
    expect(validateUniverseShape(universe)).toBe(true);
  });

  it('builds a scenario with a finite camera and an exact summary', () => {
    const scenario = generateScenario({ seed: 11, planetCount: 2, systemName: 'Scenario' });
    const expected = generateUniverse({ seed: 11, planetCount: 2, systemName: 'Scenario' });
    expect(scenario.universe.bodies.map((body) => body.physical.position)).toEqual(
      expected.bodies.map((body) => body.physical.position),
    );
    expect(scenario.camera.suggestedDistance).toBeGreaterThan(0);
    expect(Number.isFinite(scenario.camera.suggestedDistance)).toBe(true);
    expect(scenario.universe.bodies.length).toBe(expected.bodies.length);

    const summaryConfig = {
      ...DEFAULT_GENERATOR_CONFIG,
      starCount: 2,
      planetCount: 4,
      moonCount: 1,
      asteroidCount: 7,
    } satisfies GeneratorConfig;
    expect(generatorSummary(summaryConfig)).toBe('2 stars · 4 planets · 1 moons · 7 asteroids');
  });
});
