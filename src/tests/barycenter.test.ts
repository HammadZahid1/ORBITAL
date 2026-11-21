import { describe, expect, it } from 'vitest';
import {
  barycentricCoordinates,
  centerOfMass,
  centerOfMassVelocity,
  relativeToBody,
  shiftToBarycentricFrame,
} from '../engine/coordinates/barycenter';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';

function weightedWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.mass[0] = 1;
  world.mass[1] = 3;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 4, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: 4, y: 0, z: 0 });
  return world;
}

describe('barycentric coordinate calculations', () => {
  it('finds the mass-weighted centre', () => {
    expect(centerOfMass(weightedWorld())).toEqual({ x: 3, y: 0, z: 0 });
  });

  it('finds the centre-of-mass velocity', () => {
    expect(centerOfMassVelocity(weightedWorld())).toEqual({ x: 3, y: 0, z: 0 });
  });

  it('shifts into a barycentric inertial frame', () => {
    const world = weightedWorld();
    shiftToBarycentricFrame(world);
    expect(centerOfMass(world).x).toBeCloseTo(0, 12);
    expect(centerOfMassVelocity(world).x).toBeCloseTo(0, 12);
    expect(world.pos[3]).toBeCloseTo(1, 12);
  });

  it('expresses arbitrary points relative to the barycentre', () => {
    expect(barycentricCoordinates(weightedWorld(), { x: 5, y: 2, z: -1 })).toEqual({
      x: 2,
      y: 2,
      z: -1,
    });
  });

  it('computes positions relative to one body', () => {
    const positions = relativeToBody(weightedWorld(), 0);
    expect(positions[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(positions[1]).toEqual({ x: 4, y: 0, z: 0 });
  });
});
