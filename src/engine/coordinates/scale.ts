import type { CelestialBody } from '../../types/celestial';
import type { Vec3 } from '../../types/vector';

export type ScaleMode = 'exploration' | 'compressed' | 'educational' | 'realistic';

export interface SceneScale {
  /** Metres represented by one scene unit for positions. */
  distance: number;
  /** Metres represented by one scene unit for body radii. */
  radius: number;
  mode: ScaleMode;
  label: string;
}

const MODE_LABELS: Record<ScaleMode, string> = {
  exploration: 'Exploration — distances and radii compressed',
  compressed: 'Compressed — logarithmic distance mapping',
  educational: 'Educational — evenly spaced orbits',
  realistic: 'Realistic — linear scale (bodies are sub-pixel)',
};

export function maxOrbitalRadius(bodies: readonly CelestialBody[]): number {
  return Math.max(
    ...bodies.map((body) =>
      Math.hypot(body.physical.position.x, body.physical.position.y, body.physical.position.z),
    ),
    1e6,
  );
}

export function createSceneScale(bodies: readonly CelestialBody[], mode: ScaleMode): SceneScale {
  const extent = maxOrbitalRadius(bodies);
  const distance = extent / 100;
  switch (mode) {
    case 'realistic':
      return { distance, radius: distance, mode, label: MODE_LABELS[mode] };
    case 'compressed':
      return { distance: Math.max(distance / 4, 1), radius: distance / 60, mode, label: MODE_LABELS[mode] };
    case 'educational':
      return { distance, radius: distance / 12, mode, label: MODE_LABELS[mode] };
    default:
      return { distance, radius: distance / 24, mode, label: MODE_LABELS[mode] };
  }
}

export function scenePosition(position: Readonly<Vec3>, scale: SceneScale): Vec3 {
  if (scale.mode === 'compressed') {
    const compress = (value: number) => {
      const sign = value < 0 ? -1 : 1;
      return sign * Math.log10(1 + Math.abs(value) / scale.distance) * 8;
    };
    return {
      x: compress(position.x),
      y: compress(position.y),
      z: compress(position.z),
    };
  }
  if (scale.mode === 'educational') {
    const extent = Math.max(Math.hypot(position.x, position.y, position.z), 1);
    const factor = 100 / Math.max(scale.distance, 1);
    const normalised = Math.log10(1 + extent / Math.max(scale.distance, 1)) / Math.log10(1 + 100);
    const amount = normalised * 100;
    return {
      x: (position.x / extent) * amount,
      y: (position.y / extent) * amount,
      z: (position.z / extent) * amount,
    };
  }
  return {
    x: position.x / scale.distance,
    y: position.y / scale.distance,
    z: position.z / scale.distance,
  };
}

export function sceneRadius(body: CelestialBody, scale: SceneScale): number {
  const physical = body.physical.radius / scale.radius;
  const minimum = body.type === 'star' ? 1.5 : body.type === 'blackhole' ? 1.2 : 0.28;
  return Math.max(minimum, physical * body.visual.visualScale);
}

export function sceneVector(vector: Readonly<Vec3>, scale: SceneScale): Vec3 {
  return { x: vector.x / scale.distance, y: vector.y / scale.distance, z: vector.z / scale.distance };
}
