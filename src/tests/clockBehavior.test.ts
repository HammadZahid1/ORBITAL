import { describe, expect, it } from 'vitest';
import { createBody } from '../data/bodyFactory';
import { G } from '../engine/numeric';
import { readVec3 } from '../engine/physics/world';
import { SimulationClock } from '../engine/simulation/clock';
import { SimulationEngine } from '../engine/simulation/engine';

function circularBodies() {
  const mass = 5.9722e24;
  const separation = 3.844e8;
  const radius = separation / 2;
  const speed = Math.sqrt((G * mass) / (2 * separation));
  return [
    createBody({
      id: 'a',
      name: 'a',
      mass,
      position: { x: -radius, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -speed },
    }),
    createBody({
      id: 'b',
      name: 'b',
      mass,
      position: { x: radius, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: speed },
    }),
  ];
}

describe('simulation clock behaviour', () => {
  it('keeps the previous speed and time scale when given invalid values', () => {
    const clock = new SimulationClock();
    clock.setSpeed(4);
    clock.setSpeed(-1);
    clock.setSpeed(Number.NaN);
    clock.setSpeed(Number.POSITIVE_INFINITY);
    expect(clock.speed).toBe(4);
    clock.setSpeed(0);
    expect(clock.speed).toBe(0);

    clock.setTimeScale(1200);
    clock.setTimeScale(0);
    clock.setTimeScale(-10);
    clock.setTimeScale(Number.NaN);
    expect(clock.timeScale).toBe(1200);
  });

  it('accumulates valid deltas but rejects non-finite and negative ones', () => {
    const clock = new SimulationClock();
    clock.running = true;
    clock.speed = 2;
    clock.timeScale = 10;

    expect(clock.simulatedDelta(Number.NaN)).toBe(0);
    expect(clock.simulatedDelta(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clock.simulatedDelta(-0.1)).toBe(0);
    expect(clock.elapsed).toBe(0);

    expect(clock.advance(0.1)).toBeCloseTo(2, 12);
    expect(clock.advance(0.5)).toBeCloseTo(5, 12); // clamped to 0.25 s of real time
    expect(clock.elapsed).toBeCloseTo(7, 12);

    clock.running = false;
    expect(clock.advance(1)).toBe(0);
    expect(clock.elapsed).toBeCloseTo(7, 12);
  });

  it('steps time manually without running and ignores non-finite amounts', () => {
    const clock = new SimulationClock();
    clock.stepForward(100);
    clock.stepBackward(30);
    expect(clock.elapsed).toBe(70);
    clock.stepForward(Number.NaN);
    clock.stepBackward(Number.POSITIVE_INFINITY);
    expect(clock.elapsed).toBe(70);
    clock.steps = 12;
    clock.reset();
    expect(clock.elapsed).toBe(0);
    expect(clock.steps).toBe(0);
  });

  it('caps solver substeps and keeps world time aligned with the clock', () => {
    const engine = new SimulationEngine(circularBodies(), {
      G,
      softening: 0,
      timestep: 1,
      maxStepsPerFrame: 3,
    });
    engine.clock.setTimeScale(1000);
    engine.clock.running = true;

    expect(engine.advance(1)).toBe(3);
    expect(engine.clock.elapsed).toBe(250); // 0.25 s real-time clamp × 1000
    expect(engine.world.time).toBe(250);
    expect(engine.world.steps).toBe(3);
    expect(engine.clock.steps).toBe(3);

    expect(engine.advance(0)).toBe(0);
    expect(engine.world.steps).toBe(3);
    engine.clock.running = false;
    expect(engine.advance(1)).toBe(0);
    expect(engine.world.steps).toBe(3);
  });

  it('undoes a short integration interval when stepping backwards', () => {
    const engine = new SimulationEngine(circularBodies(), {
      G,
      softening: 0,
      timestep: 1000,
      integrator: 'rk4',
    });
    const start = readVec3(engine.world.pos, 1);
    for (let i = 0; i < 12; i += 1) engine.step();
    const advanced = readVec3(engine.world.pos, 1);
    expect(advanced).not.toEqual(start);

    for (let i = 0; i < 12; i += 1) engine.stepBackward();
    const returned = readVec3(engine.world.pos, 1);
    const separation = 3.844e8;
    expect(Math.hypot(returned.x - start.x, returned.y - start.y, returned.z - start.z) / separation).toBeLessThan(1e-6);
    expect(engine.clock.elapsed).toBeCloseTo(0, 9);
  });
});
