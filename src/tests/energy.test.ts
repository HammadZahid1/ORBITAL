import { describe, expect, it } from 'vitest';
import {
  computeEnergy,
  energyDrift,
  kineticEnergy,
  potentialEnergy,
  relativeAngularMomentum,
  totalAngularMomentum,
  totalLinearMomentum,
} from '../engine/energy/energy';
import { AU, EARTH_MASS, G, SOLAR_MASS } from '../engine/numeric';
import { computeAccelerations } from '../engine/physics/gravity';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';

function twoBodyWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.G = G;
  world.softening = 0;
  world.mass[0] = SOLAR_MASS;
  world.mass[1] = EARTH_MASS;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: AU, y: 0, z: 0 });
  const speed = Math.sqrt((G * SOLAR_MASS) / AU);
  writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: speed });
  computeAccelerations(world);
  return { world, speed };
}

describe('energy and momentum diagnostics', () => {
  it('computes kinetic and potential energy of a circular orbit', () => {
    const { world, speed } = twoBodyWorld();
    expect(kineticEnergy(world)).toBeCloseTo(0.5 * EARTH_MASS * speed ** 2, 10);
    expect(potentialEnergy(world)).toBeCloseTo((-G * SOLAR_MASS * EARTH_MASS) / AU, 0);
    const energy = computeEnergy(world);
    expect(energy.total).toBeLessThan(0);
    expect(energy.kinetic).toBeCloseTo(-energy.potential / 2, 6);
  });

  it('computes angular and linear momentum', () => {
    const { world, speed } = twoBodyWorld();
    const angular = totalAngularMomentum(world);
    expect(angular.x).toBeCloseTo(0, 10);
    expect(angular.z).toBeCloseTo(0, 10);
    expect(angular.y).toBeCloseTo(-EARTH_MASS * AU * speed, 0);
    expect(totalLinearMomentum(world).z).toBeCloseTo(EARTH_MASS * speed, 0);
    const relative = relativeAngularMomentum(world, 1, 0);
    expect(relative.y).toBeLessThan(0);
  });

  it('reports relative energy drift', () => {
    expect(energyDrift(110, 100)).toBeCloseTo(0.1, 10);
    expect(energyDrift(100, 0)).toBe(0);
  });

  it('handles empty systems without NaN', () => {
    const world = createPhysicsWorld(1);
    expect(computeEnergy(world).total).toBe(0);
  });
});
