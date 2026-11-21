import { describe, expect, it } from 'vitest';
import { predictTrajectory } from '../engine/trajectory/prediction';
import { TrajectoryRecorder } from '../engine/trajectory/history';
import { createPhysicsWorld, writeVec3 } from '../engine/physics/world';
import { G } from '../engine/numeric';

function twoBodyWorld() {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.ids.push('primary', 'secondary');
  world.G = G;
  world.softening = 0;
  world.mass[0] = 1e30;
  world.mass[1] = 1e20;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 1e11, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: 0, y: 0, z: -Math.sqrt((G * 1e30) / 1e11) });
  return world;
}

describe('trajectory recorder', () => {
  it('records ordered samples', () => {
    const world = twoBodyWorld();
    const recorder = new TrajectoryRecorder(4);
    recorder.record(world, true);
    world.time = 1;
    world.pos[3] += 1;
    recorder.record(world, true);
    const points = recorder.points(world.ids[1]);
    expect(points).toHaveLength(2);
    expect(points[1].x).toBeGreaterThan(points[0].x);
  });

  it('overwrites the oldest sample when the ring buffer is full', () => {
    const world = twoBodyWorld();
    const recorder = new TrajectoryRecorder(3);
    for (let i = 0; i < 6; i += 1) {
      world.time = i;
      world.pos[3] = i;
      recorder.record(world, true);
    }
    expect(recorder.positions(world.ids[1])).toEqual(Float64Array.from([3, 0, 0, 4, 0, 0, 5, 0, 0]));
  });

  it('honours the sampling interval and supports reset', () => {
    const world = twoBodyWorld();
    const recorder = new TrajectoryRecorder(10, 5);
    world.time = 1;
    recorder.record(world);
    world.time = 3;
    recorder.record(world);
    expect(recorder.points(world.ids[0])).toHaveLength(1);
    world.time = 7;
    recorder.record(world);
    expect(recorder.points(world.ids[0])).toHaveLength(2);
    recorder.reset(world.ids[0]);
    expect(recorder.points(world.ids[0])).toHaveLength(0);
  });

  it('does not mutate the source world during prediction', () => {
    const world = twoBodyWorld();
    const before = world.pos[3];
    const points = predictTrajectory(world, 1, { steps: 100, dt: 60, integrator: 'velocity-verlet', sampleEvery: 10 });
    expect(points.length).toBe(11);
    expect(world.pos[3]).toBe(before);
    expect(points.at(-1)!.z).not.toBe(points[0].z);
  });
});
