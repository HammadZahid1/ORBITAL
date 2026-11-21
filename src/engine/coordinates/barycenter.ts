import type { Vec3 } from '../../types/vector';
import type { PhysicsWorld } from '../physics/world';
import { scale3, sub3 } from '../vector';

/** Mass-weighted centre of mass of the simulated system. */
export function centerOfMass(world: PhysicsWorld): Vec3 {
  let mass = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < world.count; i += 1) {
    const m = Math.max(world.mass[i], 0);
    mass += m;
    x += m * world.pos[i * 3];
    y += m * world.pos[i * 3 + 1];
    z += m * world.pos[i * 3 + 2];
  }
  if (mass <= 0) return { x: 0, y: 0, z: 0 };
  return { x: x / mass, y: y / mass, z: z / mass };
}

/** Velocity of the centre of mass. */
export function centerOfMassVelocity(world: PhysicsWorld): Vec3 {
  let mass = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < world.count; i += 1) {
    const m = Math.max(world.mass[i], 0);
    mass += m;
    x += m * world.vel[i * 3];
    y += m * world.vel[i * 3 + 1];
    z += m * world.vel[i * 3 + 2];
  }
  if (mass <= 0) return { x: 0, y: 0, z: 0 };
  return { x: x / mass, y: y / mass, z: z / mass };
}

/** Coordinates of a point expressed relative to the centre of mass. */
export function barycentricCoordinates(world: PhysicsWorld, point: Readonly<Vec3>): Vec3 {
  return sub3(point, centerOfMass(world));
}

/** Shifts all positions and velocities into the barycentric inertial frame. */
export function shiftToBarycentricFrame(world: PhysicsWorld): void {
  const origin = centerOfMass(world);
  const velocity = centerOfMassVelocity(world);
  for (let i = 0; i < world.count; i += 1) {
    world.pos[i * 3] -= origin.x;
    world.pos[i * 3 + 1] -= origin.y;
    world.pos[i * 3 + 2] -= origin.z;
    world.vel[i * 3] -= velocity.x;
    world.vel[i * 3 + 1] -= velocity.y;
    world.vel[i * 3 + 2] -= velocity.z;
    world.lockPos[i * 3] -= origin.x;
    world.lockPos[i * 3 + 1] -= origin.y;
    world.lockPos[i * 3 + 2] -= origin.z;
    world.lockVel[i * 3] -= velocity.x;
    world.lockVel[i * 3 + 1] -= velocity.y;
    world.lockVel[i * 3 + 2] -= velocity.z;
  }
  world.accInitialized = false;
}

/** Positions in a frame centred on one body (relative, non-inertial). */
export function relativeToBody(world: PhysicsWorld, index: number): Vec3[] {
  const base = { x: world.pos[index * 3], y: world.pos[index * 3 + 1], z: world.pos[index * 3 + 2] };
  const result: Vec3[] = [];
  for (let i = 0; i < world.count; i += 1) {
    result.push(
      scale3(
        sub3(
          { x: world.pos[i * 3], y: world.pos[i * 3 + 1], z: world.pos[i * 3 + 2] },
          base,
        ),
        1,
      ),
    );
  }
  return result;
}
