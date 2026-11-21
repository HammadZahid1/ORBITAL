import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../../types/vector';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { engine, recorder, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface TrajectoryLinesProps {
  scale: SceneScale;
}

/** Historical paths sampled from the fixed-memory trajectory recorder. */
export function TrajectoryLines({ scale }: TrajectoryLinesProps) {
  const bodies = useSimulationStore((state) => state.bodies);
  const frame = useSimulationStore((state) => state.frame);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const layers = useUIStore((state) => state.layers);

  const lines = useMemo(() => {
    if (!layers.trails.visible) return [];
    const result: Array<{ id: string; geometry: THREE.BufferGeometry; selected: boolean; color: string }> = [];
    const limit = useUIStore.getState().settings.performance.trailLength;

    for (const body of bodies) {
      if (!body.visual.trail.enabled || !body.visible) continue;
      const data = recorder.positions(body.id);
      const pointCount = Math.min(data.length / 3, limit);
      if (pointCount < 2) continue;
      const offset = data.length / 3 - pointCount;
      const vertices = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i += 1) {
        const point = scenePosition(
          { x: data[(offset + i) * 3], y: data[(offset + i) * 3 + 1], z: data[(offset + i) * 3 + 2] } satisfies Vec3,
          scale,
        );
        vertices[i * 3] = point.x;
        vertices[i * 3 + 1] = point.y;
        vertices[i * 3 + 2] = point.z;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      result.push({
        id: body.id,
        geometry,
        selected: body.id === selectedId,
        color: body.visual.trail.color ?? body.visual.color,
      });
    }
    return result;
  }, [bodies, frame, layers.trails.visible, scale, selectedId]);

  useEffect(() => () => lines.forEach((line) => line.geometry.dispose()), [lines]);

  if (engine.world.count === 0) return null;

  return (
    <group name="trails">
      {lines.map((line) => (
        <line key={line.id} geometry={line.geometry}>
          <lineBasicMaterial
            color={line.color}
            transparent
            opacity={(line.selected ? 0.9 : 0.45) * layers.trails.opacity}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}
