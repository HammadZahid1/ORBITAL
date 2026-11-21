import { describe, expect, it } from 'vitest';
import {
  accelerationAt,
  computeAccelerations,
  fieldAcceleration,
  gravitationalAcceleration,
  gravitationalForce,
} from '../engine/physics/gravity';
import { G } from '../engine/numeric';
import { potentialEnergy } from '../engine/energy/energy';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';

const MASS_A = 1e24;
const MASS_B = 1e23;
const SOFTENING = 1e5;

function relativeDifference(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-300);
}

function pairWorld(separation: number, softening: number) {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = softening;
  world.mass[0] = MASS_A;
  world.mass[1] = MASS_B;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: separation, y: 0, z: 0 });
  return world;
}

describe('Plummer softening behaviour', () => {
  it('recovers the Newtonian force far away and halves it at r = epsilon', () => {
    const far = 1e9;
    const newtonian = (G * MASS_A * MASS_B) / far ** 2;
    expect(relativeDifference(gravitationalForce(MASS_A, MASS_B, far, G, SOFTENING), newtonian)).toBeLessThan(1e-6);

    const newtonianAtSoftening = (G * MASS_A * MASS_B) / SOFTENING ** 2;
    const atSoftening = gravitationalForce(MASS_A, MASS_B, SOFTENING, G, SOFTENING);
    expect(relativeDifference(atSoftening, newtonianAtSoftening / 2)).toBeLessThan(1e-12);

    const atZero = gravitationalForce(MASS_A, MASS_B, 0, G, SOFTENING);
    expect(Number.isFinite(atZero)).toBe(true);
    expect(relativeDifference(atZero, (G * MASS_A * MASS_B) / SOFTENING ** 2)).toBeLessThan(1e-12);
  });

  it('uses a finite microscopic floor when softening is configured as zero', () => {
    const floor = 1e-6;
    // At exactly zero separation the directional acceleration is zero, while
    // the force law in the previous case remains finite thanks to the floor.
    expect(gravitationalAcceleration(MASS_A, 0, G, 0)).toBe(0);
    const atFloor = gravitationalAcceleration(MASS_A, floor, G, 0);
    expect(Number.isFinite(atFloor)).toBe(true);
    expect(relativeDifference(atFloor, (G * MASS_A) / (2 ** 1.5 * floor ** 2))).toBeLessThan(1e-12);

    const distance = 1e3;
    expect(
      relativeDifference(gravitationalAcceleration(MASS_A, distance, G, 0), (G * MASS_A) / distance ** 2),
    ).toBeLessThan(1e-10);

    const world = pairWorld(0, 0);
    expect(() => computeAccelerations(world)).not.toThrow();
    // Coincident bodies exert no directional acceleration, but the magnitude
    // regularization keeps the computation finite.
    expect(Number.isFinite(world.acc[3])).toBe(true);
    expect(world.acc[3]).toBe(0);
  });

  it('suppresses close encounters monotonically while leaving distant encounters intact', () => {
    const close = 1e5;
    const unsoftened = gravitationalAcceleration(MASS_B, close, G, 0);
    const softened = gravitationalAcceleration(MASS_B, close, G, close);
    expect(relativeDifference(softened / unsoftened, 2 ** -1.5)).toBeLessThan(1e-12);

    const accelerationAtDistance = (distance: number, epsilon: number) => {
      const world = pairWorld(distance, epsilon);
      return accelerationAt(world, 0).x;
    };
    // Plummer acceleration rises from the centre, peaks at r = epsilon / sqrt(2),
    // then decays back to the Newtonian r^-2 law at large separations.
    const peak = accelerationAtDistance(SOFTENING / Math.SQRT2, SOFTENING);
    expect(peak).toBeGreaterThan(accelerationAtDistance(0.5e5, SOFTENING));
    expect(peak).toBeGreaterThan(softened);
    expect(softened).toBeGreaterThan(accelerationAtDistance(2e5, SOFTENING));
    expect(accelerationAtDistance(2e5, SOFTENING)).toBeGreaterThan(
      accelerationAtDistance(1e6, SOFTENING),
    );

    const softer = accelerationAtDistance(close, 2 * SOFTENING);
    expect(softer).toBeLessThan(softened);
    expect(relativeDifference(accelerationAtDistance(1e9, SOFTENING), accelerationAtDistance(1e9, 0))).toBeLessThan(1e-6);
  });

  it('applies the same softening to potential energy and field sampling', () => {
    const separation = SOFTENING;
    const world = pairWorld(separation, SOFTENING);
    const softenedPotential = potentialEnergy(world);
    const newtonianPotential = (-G * MASS_A * MASS_B) / separation;
    expect(relativeDifference(softenedPotential, newtonianPotential / Math.SQRT2)).toBeLessThan(1e-12);

    const coincidentWorld = pairWorld(0, SOFTENING);
    expect(Number.isFinite(potentialEnergy(coincidentWorld))).toBe(true);
    expect(potentialEnergy(coincidentWorld)).toBeCloseTo((-G * MASS_A * MASS_B) / SOFTENING, 0);

    const single = createPhysicsWorld(1);
    single.count = 1;
    single.G = G;
    single.softening = SOFTENING;
    single.mass[0] = MASS_A;
    writeVec3(single.pos, 0, { x: 10, y: -20, z: 30 });
    const atCentre = fieldAcceleration(single, 10, -20, 30);
    expect(atCentre).toEqual({ x: 0, y: 0, z: 0 });
    const right = fieldAcceleration(single, 10 + SOFTENING, -20, 30);
    const left = fieldAcceleration(single, 10 - SOFTENING, -20, 30);
    expect(right.x).toBeCloseTo(-left.x, 18);
    expect(right.y).toBeCloseTo(0, 18);
    expect(right.z).toBeCloseTo(0, 18);
  });
});
