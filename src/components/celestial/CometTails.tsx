import { useMemo } from 'react';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition, sceneVector } from '../../engine/coordinates/scale';
import { readVec3 } from '../../engine/physics/world';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface CometTailsProps {
  scale: SceneScale;
}

/** Simple anti-sunward tail indicator driven by live velocity and primary position. */
export function CometTails({ scale }: CometTailsProps) {
  const bodies = useSimulationStore((state) => state.bodies);
  const frame = useSimulationStore((state) => state.frame);
  const visible = useUIStore((state) => state.layers['comet-tails'].visible);
  const opacity = useUIStore((state) => state.layers['comet-tails'].opacity);

  const tails = useMemo(() => {
    if (!visible) return [];
    const world = engine.world;
    const primaryIndex = bodies.findIndex((body) => body.type === 'star');
    const primaryPhysical = primaryIndex >= 0 ? readVec3(world.pos, primaryIndex) : { x: 0, y: 0, z: 0 };
    const primaryPosition = scenePosition(primaryPhysical, scale);
    const result: Array<{ id: string; geometry: THREE.BufferGeometry; color: string }> = [];

    for (const body of bodies) {
      if (body.type !== 'comet' || !body.visible) continue;
      const index = world.ids.indexOf(body.id);
      if (index < 0) continue;
      const position = scenePosition(readVec3(world.pos, index), scale);
      const velocity = sceneVector(readVec3(world.vel, index), scale);
      const away = new THREE.Vector3(
        position.x - primaryPosition.x,
        position.y - primaryPosition.y,
        position.z - primaryPosition.z,
      );
      if (away.lengthSq() < 1e-10) away.copy(new THREE.Vector3(velocity.x, velocity.y, velocity.z));
      if (away.lengthSq() < 1e-10) continue;
      away.normalize();
      const head = new THREE.Vector3(position.x, position.y, position.z);
      const tailLength = 1.2 + Math.min(4, Math.hypot(head.x, head.y, head.z) * 0.04);
      const points = [
        head,
        head.clone().addScaledVector(away, tailLength * 0.4),
        head.clone().addScaledVector(away, tailLength).add(new THREE.Vector3(0, tailLength * 0.08, 0)),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      result.push({ id: body.id, geometry, color: body.visual.color });
    }
    return result;
  }, [bodies, frame, scale, visible]);

  if (!visible) return null;

  return (
    <group name="comet-tails">
      {tails.map((tail) => (
        <line key={tail.id} geometry={tail.geometry}>
          <lineBasicMaterial color={tail.color} transparent opacity={0.55 * opacity} depthWrite={false} />
        </line>
      ))}
    </group>
  );
}
