/** Reusable camera framing presets expressed as multiples of a body radius. */

import { clamp, finiteOr } from '../engine/numeric';

export type CameraPresetId = 'overview' | 'system' | 'planet' | 'moon' | 'close' | 'surface';

export interface CameraPreset {
  factor: number;
  minDistance: number;
  maxDistance: number;
  fov: number;
}

export const CAMERA_DISTANCE_PRESETS: Record<CameraPresetId, CameraPreset> = {
  overview: { factor: 12, minDistance: 80, maxDistance: 2000, fov: 55 },
  system: { factor: 6, minDistance: 20, maxDistance: 1200, fov: 52 },
  planet: { factor: 3.5, minDistance: 3, maxDistance: 400, fov: 50 },
  moon: { factor: 2.4, minDistance: 1.5, maxDistance: 120, fov: 48 },
  close: { factor: 1.6, minDistance: 0.8, maxDistance: 40, fov: 45 },
  surface: { factor: 1.15, minDistance: 0.5, maxDistance: 8, fov: 60 },
};

/** Matches the orbit-control limits used by the camera rig. */
export const CAMERA_DISTANCE_LIMITS = { min: 0.5, max: 2000 } as const;

export function clampCameraDistance(distance: number): number {
  return clamp(
    finiteOr(distance, CAMERA_DISTANCE_LIMITS.min),
    CAMERA_DISTANCE_LIMITS.min,
    CAMERA_DISTANCE_LIMITS.max,
  );
}

/** Framing distance for a scene radius under a named preset. */
export function cameraDistanceForRadius(radius: number, preset: CameraPresetId = 'planet'): number {
  const settings = CAMERA_DISTANCE_PRESETS[preset] ?? CAMERA_DISTANCE_PRESETS.planet;
  const scaled = Math.max(finiteOr(radius, 0), 0) * settings.factor;
  return clampCameraDistance(clamp(scaled, settings.minDistance, settings.maxDistance));
}

/** Suggested preset for a body radius, ordered from closest to widest. */
export function cameraPresetForRadius(radius: number): CameraPresetId {
  const value = Math.max(finiteOr(radius, 0), 0);
  if (value >= 50) return 'overview';
  if (value >= 10) return 'system';
  if (value >= 2) return 'planet';
  if (value >= 0.5) return 'moon';
  if (value >= 0.2) return 'close';
  return 'surface';
}

export function cameraFov(preset: CameraPresetId): number {
  return (CAMERA_DISTANCE_PRESETS[preset] ?? CAMERA_DISTANCE_PRESETS.planet).fov;
}
