import { describe, expect, it } from 'vitest';
import { validateBody } from '../data/bodyFactory';
import { createExtraScenarios, EXTRA_SCENARIOS } from '../scenarios/extra';
import { SCENARIOS, validateScenario } from '../scenarios/registry';
import type { Scenario } from '../scenarios/types';
import type { CelestialBody } from '../types/celestial';

/** Systems whose initial conditions are built to have exactly zero total momentum. */
const BARYCENTRIC_IDS = new Set([
  'pluto-charon-binary',
  'compact-binary-inspiral-analogue',
  'three-star-hierarchy',
]);

function allBodies(scenario: Scenario): CelestialBody[] {
  return scenario.universe.bodies;
}

function massMomentum(scenario: Scenario): { mass: number; magnitude: number; scale: number } {
  let mass = 0;
  let px = 0;
  let py = 0;
  let pz = 0;
  let scale = 0;
  for (const body of allBodies(scenario)) {
    const { mass: bodyMass, velocity } = body.physical;
    mass += bodyMass;
    px += bodyMass * velocity.x;
    py += bodyMass * velocity.y;
    pz += bodyMass * velocity.z;
    scale += bodyMass * Math.hypot(velocity.x, velocity.y, velocity.z);
  }
  return { mass, magnitude: Math.hypot(px, py, pz), scale };
}

function expectFiniteTriple(value: { x: number; y: number; z: number }): void {
  expect(Number.isFinite(value.x)).toBe(true);
  expect(Number.isFinite(value.y)).toBe(true);
  expect(Number.isFinite(value.z)).toBe(true);
}

describe('extra scenario library', () => {
  it('exports at least twelve uniquely identified scenarios', () => {
    expect(EXTRA_SCENARIOS.length).toBeGreaterThanOrEqual(12);
    const ids = EXTRA_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.trim().length > 0)).toBe(true);
    for (const scenario of EXTRA_SCENARIOS) {
      expect(scenario.universe.id).toBe(`universe-${scenario.id}`);
    }
  });

  it('does not reuse any built-in scenario id', () => {
    const builtInIds = new Set(SCENARIOS.map((scenario) => scenario.id));
    expect(builtInIds.size).toBeGreaterThan(0);
    for (const scenario of EXTRA_SCENARIOS) {
      expect(builtInIds.has(scenario.id)).toBe(false);
    }
  });

  it('provides complete, descriptive scenario metadata and cameras', () => {
    const descriptions = new Set<string>();
    for (const scenario of EXTRA_SCENARIOS) {
      expect(validateScenario(scenario)).toBe(true);
      expect(scenario.name.trim().length).toBeGreaterThan(3);
      expect(scenario.description.trim().length).toBeGreaterThan(40);
      expect(scenario.educationalNotes.trim().length).toBeGreaterThan(60);
      expect(scenario.universe.description.trim().length).toBeGreaterThan(40);
      expect(scenario.tags.length).toBeGreaterThan(0);
      descriptions.add(scenario.description);

      expectFiniteTriple({ x: scenario.camera.position[0], y: scenario.camera.position[1], z: scenario.camera.position[2] });
      expectFiniteTriple({ x: scenario.camera.target[0], y: scenario.camera.target[1], z: scenario.camera.target[2] });
      expect(scenario.camera.suggestedDistance).toBeGreaterThan(0);
      expect(Number.isFinite(scenario.camera.suggestedDistance)).toBe(true);
    }
    expect(descriptions.size).toBe(EXTRA_SCENARIOS.length);
  });

  it('gives every body finite, positive physical state', () => {
    for (const scenario of EXTRA_SCENARIOS) {
      const bodyIds = new Set<string>();
      expect(allBodies(scenario).length).toBeGreaterThan(0);
      for (const body of allBodies(scenario)) {
        expect(validateBody(body)).toEqual([]);
        expect(bodyIds.has(body.id)).toBe(false);
        bodyIds.add(body.id);
        expectFiniteTriple(body.physical.position);
        expectFiniteTriple(body.physical.velocity);
        expectFiniteTriple(body.physical.acceleration);
        expect(Number.isFinite(body.physical.rotation)).toBe(true);
        expect(Number.isFinite(body.physical.rotationSpeed)).toBe(true);
        expect(body.visual.visualScale).toBeGreaterThan(0);
      }
    }
  });

  it('builds identical state on every construction', () => {
    expect(createExtraScenarios()).toEqual(EXTRA_SCENARIOS);
    expect(structuredClone(EXTRA_SCENARIOS)).toEqual(EXTRA_SCENARIOS);
  });

  it('has positive total mass in every scenario', () => {
    for (const scenario of EXTRA_SCENARIOS) {
      const { mass } = massMomentum(scenario);
      expect(Number.isFinite(mass)).toBe(true);
      expect(mass).toBeGreaterThan(0);
    }
  });

  it('keeps momentum finite and sanity-checks barycentric systems', () => {
    for (const scenario of EXTRA_SCENARIOS) {
      const { magnitude, scale } = massMomentum(scenario);
      expect(Number.isFinite(magnitude)).toBe(true);
      expect(Number.isFinite(scale)).toBe(true);
      if (BARYCENTRIC_IDS.has(scenario.id)) {
        expect(magnitude).toBeLessThan(scale * 1e-9 + 1e-6);
      } else {
        expect(magnitude).toBeGreaterThan(0);
      }
    }
  });
});
