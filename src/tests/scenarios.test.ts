import { describe, expect, it } from 'vitest';
import { createSolarSystemBodies } from '../data/solarSystem';
import {
  BUILT_IN_SCENARIO_COUNT,
  DEFAULT_SCENARIO_ID,
  cloneScenario,
  getScenario,
  scenarioBodyMass,
  scenarioReferenceRadius,
  validateScenario,
} from '../scenarios/registry';
import { AU, SOLAR_MASS } from '../engine/numeric';

describe('scenario system', () => {
  it('registers a functional set of predefined scenarios', () => {
    expect(BUILT_IN_SCENARIO_COUNT).toBeGreaterThanOrEqual(14);
    expect(getScenario(DEFAULT_SCENARIO_ID)).toBeDefined();
    expect(getScenario('earth-moon')?.universe.bodies).toHaveLength(2);
    expect(getScenario('binary-star')?.universe.bodies).toHaveLength(3);
    expect(getScenario('asteroid-belt')?.universe.bodies.length).toBeGreaterThan(40);
  });

  it('loads a solar system with recognisable objects', () => {
    const bodies = createSolarSystemBodies();
    const names = bodies.map((body) => body.name);
    expect(names).toEqual(expect.arrayContaining(['Sun', 'Earth', 'Jupiter', 'Saturn', 'Moon']));
    const earth = bodies.find((body) => body.id === 'earth')!;
    expect(earth.parentId).toBe('sun');
    // Earth starts at periapsis: r = a(1 - e).
    expect(Math.hypot(earth.physical.position.x, earth.physical.position.z)).toBeCloseTo(
      AU * (1 - 0.0167),
      -8,
    );
  });

  it('validates scenarios and clones them deeply', () => {
    const scenario = getScenario('circular-orbit')!;
    expect(validateScenario(scenario)).toBe(true);
    expect(validateScenario({ id: 'bad' })).toBe(false);
    const clone = cloneScenario(scenario);
    expect(clone).not.toBe(scenario);
    clone.universe.bodies[0].physical.mass = 1;
    expect(scenario.universe.bodies[0].physical.mass).toBeGreaterThan(1);
  });

  it('reports aggregate scenario properties', () => {
    const scenario = getScenario('circular-orbit')!;
    expect(scenarioBodyMass(scenario)).toBeGreaterThan(SOLAR_MASS);
    expect(scenarioReferenceRadius(scenario)).toBeCloseTo(AU, -8);
  });
});
