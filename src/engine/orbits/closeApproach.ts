import type { IntegratorId } from '../../types/celestial';
import type { PhysicsWorld } from '../physics/world';
import { predictTrajectory } from '../trajectory/prediction';

export interface CloseApproach {
  distance: number;
  time: number;
  sampleIndex: number;
}

/** Numerically samples two predicted paths and reports their closest separation. */
export function findCloseApproach(
  world: PhysicsWorld,
  indexA: number,
  indexB: number,
  options: { steps: number; dt: number; integrator: IntegratorId; sampleEvery?: number },
): CloseApproach | null {
  if (indexA < 0 || indexB < 0 || indexA >= world.count || indexB >= world.count || indexA === indexB) return null;
  const pathA = predictTrajectory(world, indexA, options);
  const pathB = predictTrajectory(world, indexB, options);
  const samples = Math.min(pathA.length, pathB.length);
  if (samples === 0) return null;

  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  for (let i = 0; i < samples; i += 1) {
    const dx = pathA[i].x - pathB[i].x;
    const dy = pathA[i].y - pathB[i].y;
    const dz = pathA[i].z - pathB[i].z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < best) {
      best = distance;
      bestIndex = i;
    }
  }
  return {
    distance: best,
    time: bestIndex * (options.sampleEvery ?? 1) * options.dt,
    sampleIndex: bestIndex,
  };
}
