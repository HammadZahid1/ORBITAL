import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SceneScale } from '../../engine/coordinates/scale';
import { scenePosition } from '../../engine/coordinates/scale';
import { calculateOrbitalElements, sampleEllipse } from '../../engine/orbits/orbital';
import { bodyIndex, readVec3 } from '../../engine/physics/world';
import { vec3 } from '../../engine/vector';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

export interface OrbitPathsProps {
  scale: SceneScale;
}

/**
 * Draws osculating Keplerian ellipses derived from the live N-body state.
 * These are guidance curves only; bodies continue to follow the solver.
 */
export function OrbitPaths({ scale }: OrbitPathsProps) {
  const bodies = useSimulationStore((state) => state.bodies);
  const frame = useSimulationStore((state) => state.frame);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const layers = useUIStore((state) => state.layers);

  const paths = useMemo(() => {
    if (!layers.orbits.visible || bodies.length < 2) return [];
    const result: Array<{ id: string; object: THREE.Line; geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial }> = [];
    const world = engine.world;

    for (const body of bodies) {
      if (!body.parentId || !body.visible) continue;
      const index = bodyIndex(world, body.id);
      const parentIndex = bodyIndex(world, body.parentId);
      if (index < 0 || parentIndex < 0) continue;

      const elements = calculateOrbitalElements(world, index, parentIndex);
      if (
        !elements ||
        !elements.isBound ||
        !Number.isFinite(elements.semiMajorAxis) ||
        elements.semiMajorAxis <= 0 ||
        elements.eccentricity > 0.96
      ) {
        continue;
      }

      const parentPosition = readVec3(world.pos, parentIndex);
      const scenePoints = sampleEllipse(elements, 128).map((point) =>
        scenePosition(vec3(parentPosition.x + point.x, parentPosition.y + point.y, parentPosition.z + point.z), scale),
      );
      const vertices = new Float32Array(scenePoints.length * 3);
      scenePoints.forEach((point, i) => {
        vertices[i * 3] = point.x;
        vertices[i * 3 + 1] = point.y;
        vertices[i * 3 + 2] = point.z;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const highlighted = body.id === selectedId;
      const material = new THREE.LineBasicMaterial({
        color: highlighted ? '#55e0e8' : '#6b8eb5',
        transparent: true,
        opacity: (highlighted ? 0.85 : 0.4) * layers.orbits.opacity,
        depthWrite: false,
      });
      result.push({ id: body.id, object: new THREE.Line(geometry, material), geometry, material });
    }
    return result;
  }, [bodies, frame, layers.orbits.opacity, layers.orbits.visible, scale, selectedId]);

  useEffect(
    () => () =>
      paths.forEach((path) => {
        path.geometry.dispose();
        path.material.dispose();
      }),
    [paths],
  );

  return (
    <group name="orbits">
      {paths.map((path) => (
        <primitive key={path.id} object={path.object} />
      ))}
    </group>
  );
}
