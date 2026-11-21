import { useMemo } from 'react';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition, sceneVector } from '../../engine/coordinates/scale';
import { centerOfMass } from '../../engine/coordinates/barycenter';
import { fieldAcceleration } from '../../engine/physics/gravity';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface GravityFieldArrowsProps {
  scale: SceneScale;
}

/** Samples the live softened gravitational field on a coarse visual grid. */
export function GravityFieldArrows({ scale }: GravityFieldArrowsProps) {
  const frame = useSimulationStore((state) => state.frame);
  const visible = useUIStore((state) => state.layers['gravity-vectors'].visible);
  const intensity = useUIStore((state) => state.layers['gravity-vectors'].intensity);

  const arrows = useMemo(() => {
    if (!visible) return [];
    const origin = centerOfMass(engine.world);
    const step = scale.distance * 10;
    const result: Array<{ id: string; direction: THREE.Vector3; position: THREE.Vector3; length: number }> = [];

    for (let ix = -3; ix <= 3; ix += 1) {
      for (let iz = -3; iz <= 3; iz += 1) {
        const sample = { x: origin.x + ix * step, y: origin.y, z: origin.z + iz * step };
        const field = fieldAcceleration(engine.world, sample.x, sample.y, sample.z);
        const visual = sceneVector(field, scale);
        const magnitude = Math.hypot(visual.x, visual.y, visual.z);
        if (!Number.isFinite(magnitude) || magnitude < 1e-20) continue;
        const point = scenePosition(sample, scale);
        result.push({
          id: `${ix}:${iz}`,
          direction: new THREE.Vector3(visual.x, visual.y, visual.z).normalize(),
          position: new THREE.Vector3(point.x, point.y, point.z),
          length: Math.min(2.8, 0.3 + Math.log10(1 + magnitude * 1e10) * 0.35) * intensity,
        });
      }
    }
    return result;
  }, [frame, intensity, scale, visible]);

  if (!visible) return null;

  return (
    <group name="gravity-field">
      {arrows.map((arrow) => (
        <arrowHelper
          key={arrow.id}
          args={[arrow.direction, arrow.position, arrow.length, new THREE.Color('#3ea8ff'), arrow.length * 0.25, arrow.length * 0.12]}
        />
      ))}
    </group>
  );
}
