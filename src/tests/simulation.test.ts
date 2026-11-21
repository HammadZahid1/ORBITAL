import { beforeEach, describe, expect, it } from 'vitest';
import { EARTH_MASS, G, SOLAR_MASS, AU } from '../engine/numeric';
import { SimulationClock } from '../engine/simulation/clock';
import { SimulationEngine } from '../engine/simulation/engine';
import type { CelestialBody } from '../types/celestial';
import { vec3 } from '../engine/vector';

function body(id: string, mass: number, x: number, v = 0): CelestialBody {
  return {
    id,
    name: id,
    type: mass > 1e29 ? 'star' : 'planet',
    parentId: null,
    physical: {
      mass,
      radius: 1e6,
      position: vec3(x, 0, 0),
      velocity: vec3(0, 0, v),
      acceleration: vec3(),
      rotation: 0,
      rotationSpeed: 0,
    },
    visual: {
      color: '#fff',
      emissive: '#000',
      emissiveIntensity: 0,
      material: 'rocky',
      visualScale: 1,
      opacity: 1,
      atmosphere: false,
      atmosphereColor: '#fff',
      rings: false,
      ringColor: '#fff',
      trail: { enabled: false, length: 100, opacity: 1, color: null },
      labelVisible: true,
    },
    visible: true,
    locked: false,
    notes: '',
  };
}

describe('simulation clock', () => {
  it('does not advance while paused', () => {
    const clock = new SimulationClock();
    expect(clock.advance(1)).toBe(0);
    clock.running = true;
    clock.timeScale = 100;
    // A 0.5 s stall is clamped to 0.25 s to protect the solver.
    expect(clock.advance(0.5)).toBe(25);
    expect(clock.elapsed).toBe(25);
  });

  it('clamps long real deltas and validates speed', () => {
    const clock = new SimulationClock();
    clock.running = true;
    clock.setSpeed(-5);
    expect(clock.speed).toBe(1);
    clock.setSpeed(2);
    expect(clock.simulatedDelta(5)).toBeLessThanOrEqual(0.5);
    clock.stepForward(10);
    clock.stepBackward(3);
    expect(clock.elapsed).toBe(7);
    clock.stepBackward(100);
    expect(clock.elapsed).toBe(0);
  });
});

describe('simulation engine', () => {
  const bodies = () => [body('sun', SOLAR_MASS, 0), body('earth', EARTH_MASS, AU, Math.sqrt((G * SOLAR_MASS) / AU))];

  it('builds a world from body definitions', () => {
    const engine = new SimulationEngine(bodies(), { timestep: 60 });
    expect(engine.world.count).toBe(2);
    expect(engine.world.ids).toEqual(['sun', 'earth']);
    expect(engine.bodies[1].physical.acceleration.x).toBeLessThan(0);
  });

  it('advances state in fixed steps and tracks simulated time', () => {
    const engine = new SimulationEngine(bodies(), {
      timestep: 10,
      G,
      softening: 0,
    });
    engine.clock.running = true;
    engine.clock.timeScale = 1200;
    const steps = engine.advance(0.2);
    expect(steps).toBeGreaterThan(0);
    expect(engine.clock.elapsed).toBeCloseTo(240, 6);
    expect(engine.bodies[1].physical.position.z).not.toBe(0);
  });

  it('supports integrator switching, reset and body replacement', () => {
    const engine = new SimulationEngine(bodies(), { timestep: 60 });
    engine.integrator = 'rk4';
    expect(engine.integrator).toBe('rk4');
    engine.step();
    engine.reset();
    expect(engine.clock.elapsed).toBe(0);
    expect(engine.world.steps).toBe(0);

    const next = [...bodies(), body('mars', 6e23, 1.5 * AU)];
    engine.setBodies(next);
    expect(engine.world.count).toBe(3);
    expect(engine.world.ids).toContain('mars');
  });

  it('keeps locked bodies anchored', () => {
    const set = bodies();
    set[0].locked = true;
    const engine = new SimulationEngine(set, { timestep: 3600, G, softening: 0 });
    for (let i = 0; i < 40; i += 1) engine.step();
    expect(engine.world.pos[0]).toBe(0);
    expect(engine.world.pos[1]).toBe(0);
  });
});
