import { describe, expect, it } from 'vitest';
import {
  calculateOrbitalElements,
  circularOrbitVelocity,
  escapeVelocity,
  orbitalPeriod,
  sampleEllipse,
  stateFromElements,
  visVivaSpeed,
} from '../engine/orbits/orbital';
import { AU, EARTH_MASS, G, SOLAR_MASS } from '../engine/numeric';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';
import { length3 } from '../engine/vector';

function orbitWorld(speed: number) {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = 0;
  world.mass[0] = SOLAR_MASS;
  world.mass[1] = EARTH_MASS;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: AU, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: -speed });
  return world;
}

describe('orbital mechanics calculations', () => {
  it('derives circular elements for a circular orbit', () => {
    const elements = calculateOrbitalElements(orbitWorld(circularOrbitVelocity(G * SOLAR_MASS, AU)), 1, 0)!;
    expect(elements).not.toBeNull();
    expect(elements.eccentricity).toBeLessThan(1e-5);
    expect(elements.radius).toBeCloseTo(AU, 0);
    expect(Math.abs(elements.semiMajorAxis - AU) / AU).toBeLessThan(1e-4);
    expect(elements.isBound).toBe(true);
    expect(elements.isCircular).toBe(true);
    expect(elements.period).toBeGreaterThan(3.1e7);
    expect(elements.period).toBeLessThan(3.2e7);
    expect(elements.inclination).toBeCloseTo(0, 6);
  });

  it('detects escape trajectories', () => {
    const elements = calculateOrbitalElements(orbitWorld(escapeVelocity(G * SOLAR_MASS, AU) * 1.2), 1, 0)!;
    expect(elements.isBound).toBe(false);
    expect(elements.period).toBe(Infinity);
    expect(elements.eccentricity).toBeGreaterThan(1);
  });

  it('computes vis-viva speeds consistently', () => {
    expect(circularOrbitVelocity(G * SOLAR_MASS, AU)).toBeGreaterThan(0);
    expect(escapeVelocity(G * SOLAR_MASS, AU)).toBeCloseTo(
      Math.SQRT2 * circularOrbitVelocity(G * SOLAR_MASS, AU),
      6,
    );
    expect(visVivaSpeed(G * SOLAR_MASS, AU, AU)).toBeCloseTo(
      circularOrbitVelocity(G * SOLAR_MASS, AU),
      6,
    );
    expect(orbitalPeriod(AU, G * SOLAR_MASS)).toBeGreaterThan(3e7);
  });

  it('converts elements to state and back', () => {
    const elements = {
      mu: G * SOLAR_MASS,
      semiMajorAxis: 2 * AU,
      eccentricity: 0.25,
      inclination: 0.3,
      longitudeOfAscendingNode: 0.8,
      argumentOfPeriapsis: 1.2,
      trueAnomaly: 0.6,
    };
    const state = stateFromElements(elements);
    expect(length3(state.position)).toBeGreaterThan(0);
    expect(length3(state.velocity)).toBeGreaterThan(0);

    const world = createPhysicsWorld(2);
    world.count = 2;
    world.G = G;
    world.softening = 0;
    world.mass[0] = SOLAR_MASS;
    world.mass[1] = 1e10;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
    writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
    writeVec3(world.pos, 1, state.position);
    writeVec3(world.vel, 1, state.velocity);
    const recovered = calculateOrbitalElements(world, 1, 0)!;
    expect(recovered.semiMajorAxis).toBeCloseTo(elements.semiMajorAxis, -4);
    expect(recovered.eccentricity).toBeCloseTo(elements.eccentricity, 5);
    expect(recovered.inclination).toBeCloseTo(elements.inclination, 5);
  });

  it('samples closed ellipses for visualisation', () => {
    const points = sampleEllipse(
      {
        mu: G * SOLAR_MASS,
        semiMajorAxis: AU,
        eccentricity: 0.2,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        trueAnomaly: 0,
      },
      64,
    );
    expect(points).toHaveLength(65);
    expect(points[0].x).toBeCloseTo(points[64].x, 3);
    expect(points[0].z).toBeCloseTo(points[64].z, 3);
  });

  it('rejects invalid body indices', () => {
    const world = createPhysicsWorld(2);
    expect(calculateOrbitalElements(world, 0, 0)).toBeNull();
    expect(calculateOrbitalElements(world, 5, 0)).toBeNull();
  });
});
