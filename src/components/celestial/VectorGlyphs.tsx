import { useMemo } from 'react';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition, sceneVector } from '../../engine/coordinates/scale';
import { readVec3 } from '../../engine/physics/world';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface VectorGlyphsProps {
  scale: SceneScale;
}

interface Glyph {
  id: string;
  direction: THREE.Vector3;
  origin: THREE.Vector3;
  length: number;
  color: string;
}

function makeGlyph(
  id: string,
  physicalVector: { x: number; y: number; z: number },
  position: { x: number; y: number; z: number },
  scale: SceneScale,
  color: string,
  magnitudeFloor: number,
): Glyph | null {
  const vector = sceneVector(physicalVector, scale);
  const magnitude = vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
  if (!Number.isFinite(magnitude) || magnitude < magnitudeFloor) return null;
  const visualLength = Math.min(6, Math.max(0.55, Math.log10(1 + magnitude * 1e9) * 0.55));
  const scenePoint = scenePosition(position, scale);
  return {
    id,
    direction: new THREE.Vector3(vector.x, vector.y, vector.z).normalize(),
    origin: new THREE.Vector3(scenePoint.x, scenePoint.y, scenePoint.z),
    length: visualLength,
    color,
  };
}

/** Visual arrows for live kinematic state; values are read from the solver. */
export function VectorGlyphs({ scale }: VectorGlyphsProps) {
  const frame = useSimulationStore((state) => state.frame);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const layers = useUIStore((state) => state.layers);

  const glyphs = useMemo(() => {
    const result: Glyph[] = [];
    const world = engine.world;
    for (let i = 0; i < world.count; i += 1) {
      const id = world.ids[i];
      const position = readVec3(world.pos, i);
      const highlighted = id === selectedId;
      if (layers['velocity-vectors'].visible) {
        const glyph = makeGlyph(
          `${id}-velocity`,
          readVec3(world.vel, i),
          position,
          scale,
          highlighted ? '#63d6a0' : '#3ea8ff',
          1e-28,
        );
        if (glyph) result.push(glyph);
      }
      if (layers['acceleration-vectors'].visible) {
        const glyph = makeGlyph(
          `${id}-acceleration`,
          readVec3(world.acc, i),
          position,
          scale,
          highlighted ? '#e9b56b' : '#a78bfa',
          1e-34,
        );
        if (glyph) result.push(glyph);
      }
    }
    return result;
  }, [frame, layers, scale, selectedId]);

  return (
    <group name="vectors">
      {glyphs.map((glyph) => (
        <arrowHelper
          key={glyph.id}
          args={[
            glyph.direction,
            glyph.origin,
            glyph.length,
            new THREE.Color(glyph.color),
            glyph.length * 0.24,
            glyph.length * 0.12,
          ]}
        />
      ))}
    </group>
  );
}
