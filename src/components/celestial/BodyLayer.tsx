import { useMemo } from 'react';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { CelestialBodyMesh } from './CelestialBodyMesh';

export interface BodyLayerProps {
  scale: SceneScale;
}

/** Renders every body in the active universe with the current visual layers. */
export function BodyLayer({ scale }: BodyLayerProps) {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const hoveredId = useSimulationStore((state) => state.hoveredId);
  const layers = useUIStore((state) => state.layers);

  const lightPosition = useMemo<[number, number, number]>(() => {
    const primary = [...bodies]
      .filter((body) => body.type === 'star' || body.type === 'blackhole')
      .sort((a, b) => b.physical.mass - a.physical.mass)[0];
    if (!primary) return [0, 0, 0];
    const point = scenePosition(primary.physical.position, scale);
    return [point.x, point.y, point.z];
  }, [bodies, scale]);

  if (!layers.bodies.visible) return null;

  return (
    <group name="bodies">
      {bodies.map((body) => (
        <CelestialBodyMesh
          key={body.id}
          body={body}
          scale={scale}
          selected={body.id === selectedId}
          hovered={body.id === hoveredId}
          lightPosition={lightPosition}
          labelsVisible={layers.labels.visible && layers.bodies.opacity > 0.1}
        />
      ))}
    </group>
  );
}
