import { describe, expect, it } from 'vitest';
import { createBody } from '../data/bodyFactory';
import {
  createSceneScale,
  maxOrbitalRadius,
  scenePosition,
  sceneRadius,
  sceneVector,
  type SceneScale,
} from '../engine/coordinates/scale';
import { AU } from '../engine/numeric';
import type { Vec3 } from '../types/vector';

function relativeDifference(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-30);
}

function physicalFromCompressed(scene: number, scale: SceneScale): number {
  return Math.sign(scene) * (10 ** (Math.abs(scene) / 8) - 1) * scale.distance;
}

describe('scene scale round trips', () => {
  it('inverts the realistic linear mapping exactly for positions and vectors', () => {
    const bodies = [
      createBody({ id: 'a', name: 'a', position: { x: AU, y: 0, z: 0 } }),
      createBody({ id: 'b', name: 'b', position: { x: 0, y: -2 * AU, z: 3 * AU } }),
    ];
    const scale = createSceneScale(bodies, 'realistic');
    expect(scale.distance).toBeCloseTo((Math.sqrt(13) * AU) / 100, 6);

    const source: Vec3 = { x: 1.2e11, y: -3e10, z: 5e10 };
    for (const mapped of [scenePosition(source, scale), sceneVector(source, scale)]) {
      expect(relativeDifference(mapped.x * scale.distance, source.x)).toBeLessThan(1e-12);
      expect(relativeDifference(mapped.y * scale.distance, source.y)).toBeLessThan(1e-12);
      expect(relativeDifference(mapped.z * scale.distance, source.z)).toBeLessThan(1e-12);
    }
  });

  it('maps extreme distances into a finite, monotone compressed range', () => {
    const bodies = [
      createBody({ id: 'near', name: 'near', position: { x: AU, y: 0, z: 0 } }),
      createBody({ id: 'far', name: 'far', position: { x: 1000 * AU, y: 0, z: 0 } }),
    ];
    const scale = createSceneScale(bodies, 'compressed');
    expect(scale.distance).toBeCloseTo(2.5 * AU, 6); // extent/100 compressed by 4

    const mapped = [1e6, 1e8, AU, 100 * AU, 1000 * AU, 1e6 * AU].map(
      (x) => scenePosition({ x, y: 0, z: 0 }, scale).x,
    );
    for (let i = 1; i < mapped.length; i += 1) {
      expect(mapped[i]).toBeGreaterThan(mapped[i - 1]);
      expect(Number.isFinite(mapped[i])).toBe(true);
    }
    expect(mapped.at(-1)!).toBeLessThan(50);

    for (const source of [1e6, AU, 1000 * AU]) {
      const roundTrip = physicalFromCompressed(scenePosition({ x: source, y: 0, z: 0 }, scale).x, scale);
      expect(relativeDifference(roundTrip, source)).toBeLessThan(1e-9);
    }
    const negative = scenePosition({ x: -100 * AU, y: 0, z: 0 }, scale);
    expect(negative.x).toBeLessThan(0);
    expect(relativeDifference(physicalFromCompressed(negative.x, scale), -100 * AU)).toBeLessThan(1e-9);
  });

  it('fits all bodies inside the educational display radius while preserving direction', () => {
    const bodies = [
      createBody({ id: 'a', name: 'a', position: { x: AU, y: 0, z: 0 } }),
      createBody({ id: 'b', name: 'b', position: { x: 0, y: 20 * AU, z: -10 * AU } }),
    ];
    const scale = createSceneScale(bodies, 'educational');
    for (const source of [bodies[0].physical.position, bodies[1].physical.position]) {
      const mapped = scenePosition(source, scale);
      expect(Math.hypot(mapped.x, mapped.y, mapped.z)).toBeLessThanOrEqual(100 + 1e-9);
      const length = Math.hypot(source.x, source.y, source.z);
      expect(relativeDifference(mapped.x, (source.x / length) * Math.hypot(mapped.x, mapped.y, mapped.z))).toBeLessThan(1e-9);
      expect(relativeDifference(mapped.z, (source.z / length) * Math.hypot(mapped.x, mapped.y, mapped.z))).toBeLessThan(1e-9);
    }
    expect(scenePosition({ x: 0, y: 0, z: 0 }, scale)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('enforces visible-radius floors and applies visualScale to drawn radii', () => {
    const scale = createSceneScale(
      [createBody({ id: 'far', name: 'far', position: { x: AU, y: 0, z: 0 } })],
      'realistic',
    );
    expect(scale.distance).toBeCloseTo(AU / 100, 6);
    expect(sceneRadius(createBody({ id: 's', name: 's', type: 'star', radius: 1 }), scale)).toBe(1.5);
    expect(sceneRadius(createBody({ id: 'p', name: 'p', type: 'planet', radius: 1 }), scale)).toBe(0.28);
    expect(sceneRadius(createBody({ id: 'h', name: 'h', type: 'blackhole', radius: 1 }), scale)).toBe(1.2);

    const large = createBody({
      id: 'g',
      name: 'g',
      type: 'planet',
      radius: AU / 2,
      visualScale: 2,
    });
    expect(sceneRadius(large, scale)).toBeCloseTo(100, 10);
  });

  it('uses a one-megametre floor when measuring system extent', () => {
    expect(maxOrbitalRadius([])).toBe(1e6);
    expect(maxOrbitalRadius([createBody({ id: 'a', name: 'a', position: { x: 100, y: 0, z: 0 } })])).toBe(1e6);
    expect(
      maxOrbitalRadius([createBody({ id: 'b', name: 'b', position: { x: 3e6, y: 4e6, z: 0 } })]),
    ).toBeCloseTo(5e6, 6);
  });
});
