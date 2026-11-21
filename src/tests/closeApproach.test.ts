import { describe, expect, it } from 'vitest';
import { findCloseApproach } from '../engine/orbits/closeApproach';
import { createBody } from '../data/bodyFactory';
import { worldFromBodies } from '../engine/physics/world';

describe('close approach search', () => {
  it('finds the closest sampled separation', () => {
    const a = createBody({ id: 'a', name: 'A', locked: true, position: { x: 0, y: 0, z: 0 } });
    const b = createBody({ id: 'b', name: 'B', locked: true, position: { x: 0, y: 0, z: 1000 } });
    const world = worldFromBodies([a, b]);
    const approach = findCloseApproach(world, 0, 1, { steps: 10, dt: 60, integrator: 'velocity-verlet' });
    expect(approach?.distance).toBeCloseTo(1000, 6);
    expect(approach?.time).toBe(0);
  });

  it('rejects invalid indices', () => {
    const world = worldFromBodies([createBody({ id: 'a', name: 'A' })]);
    expect(findCloseApproach(world, -1, 0, { steps: 2, dt: 1, integrator: 'euler' })).toBeNull();
    expect(findCloseApproach(world, 0, 0, { steps: 2, dt: 1, integrator: 'euler' })).toBeNull();
  });
});
