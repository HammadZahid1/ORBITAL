import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { scenePosition, type SceneScale } from '../engine/coordinates/scale';
import { bodyIndex, readVec3 } from '../engine/physics/world';
import { engine } from '../state/simulationStore';

/**
 * Copies the live solver state for one body into a scene graph node.
 * Positions always come from the physics world; only axial spin is visual.
 */
export function useLiveBodyTransform(
  ref: RefObject<THREE.Object3D | null>,
  id: string,
  scale: SceneScale,
  spinRate = 0,
): void {
  const previousTime = useRef(Number.NEGATIVE_INFINITY);

  useFrame(() => {
    const object = ref.current;
    if (!object) return;
    const index = bodyIndex(engine.world, id);
    if (index < 0) return;

    const position = scenePosition(readVec3(engine.world.pos, index), scale);
    object.position.set(position.x, position.y, position.z);

    const simulatedDelta = engine.world.time - previousTime.current;
    previousTime.current = engine.world.time;
    if (spinRate !== 0 && Number.isFinite(simulatedDelta) && simulatedDelta > 0 && simulatedDelta < 1e7) {
      object.rotation.y += spinRate * simulatedDelta;
    }
  });
}
