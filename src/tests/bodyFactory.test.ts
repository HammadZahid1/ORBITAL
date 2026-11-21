import { describe, expect, it } from 'vitest';
import { createBody, createOrbitalBody, duplicateBody, nextId, validateBody } from '../data/bodyFactory';
import { MATERIALS } from '../data/materials';
import { G, SOLAR_MASS, AU } from '../engine/numeric';
import { length3 } from '../engine/vector';

describe('celestial body factory', () => {
  it('creates bodies with complete physical and visual state', () => {
    const body = createBody({ name: 'Test', type: 'planet', mass: 1e24, radius: 1e6 });
    expect(body.name).toBe('Test');
    expect(body.physical.mass).toBe(1e24);
    expect(body.physical.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(body.visual.trail.enabled).toBe(true);
    expect(validateBody(body)).toEqual([]);
  });

  it('assigns unique identifiers', () => {
    expect(nextId('x')).not.toBe(nextId('x'));
    const original = createBody({ name: 'Original' });
    const copy = duplicateBody(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toContain('copy');
    expect(copy.physical.position).toEqual(original.physical.position);
  });

  it('derives orbital initial conditions from elements', () => {
    const body = createOrbitalBody({
      name: 'Orbiter',
      centralMass: SOLAR_MASS,
      semimajorAxis: AU,
      eccentricity: 0,
    });
    expect(length3(body.physical.position)).toBeCloseTo(AU, -4);
    expect(length3(body.physical.velocity)).toBeGreaterThan(29000);
    expect(body.physical.velocity.z).toBeLessThan(0);
  });

  it('detects invalid configurations', () => {
    const body = createBody({ name: 'Invalid', mass: -1, radius: 0 });
    expect(validateBody(body)).toContain('Mass must be positive');
    expect(validateBody(body)).toContain('Radius must be positive');
    body.physical.position.x = Number.NaN;
    expect(validateBody(body)).toContain('position contains a non-finite value');
  });

  it('exposes a material preset for every visual type', () => {
    expect(Object.keys(MATERIALS)).toHaveLength(11);
    expect(MATERIALS.star.emissive).toBe(true);
    expect(MATERIALS.ocean.atmosphere).toBe(true);
    expect(G).toBeGreaterThan(0);
  });
});
