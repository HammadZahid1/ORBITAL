import { describe, expect, it } from 'vitest';
import { createBody } from '../data/bodyFactory';
import { energyBaseline, analyseStability } from '../engine/energy/stability';
import { worldFromBodies } from '../engine/physics/world';

describe('conservation stability diagnostics', () => {
  const world = worldFromBodies([
    createBody({ id: 'a', name: 'A', mass: 1e24, locked: true, position: { x: -1000, y: 0, z: 0 } }),
    createBody({ id: 'b', name: 'B', mass: 2e24, locked: true, position: { x: 1000, y: 0, z: 0 } }),
  ]);

  it('captures a finite energy baseline', () => {
    const baseline = energyBaseline(world);
    expect(Number.isFinite(baseline)).toBe(true);
    expect(baseline).toBeLessThan(0);
  });

  it('reports zero drift for an unchanged system', () => {
    const baseline = energyBaseline(world);
    const report = analyseStability(world, baseline);
    expect(report.absoluteDrift).toBeCloseTo(0, 12);
    expect(report.relativeDrift).toBe(0);
    expect(report.momentumResidual).toBe(0);
  });

  it('detects injected energy and momentum', () => {
    const baseline = energyBaseline(world);
    world.vel[0] = 100;
    const report = analyseStability(world, baseline);
    expect(report.absoluteDrift).toBeGreaterThan(0);
    expect(report.relativeDrift).toBeGreaterThan(0);
    expect(report.momentumResidual).toBeGreaterThan(0);
  });
});
