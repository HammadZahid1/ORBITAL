import type { AppSettings } from '../types/settings';
import type { LayerConfiguration } from '../types/visualization';
import { G } from '../engine/numeric';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  reduceMotion: false,
  showLabels: true,
  showGrid: true,
  showFps: false,
  panelAnimations: true,
  integrator: 'velocity-verlet',
  timestep: 3600,
  timeScale: 3600,
  cameraDamping: 0.12,
  cameraDistance: 80,
  autoFollow: false,
  performance: {
    quality: 'balanced',
    particleDensity: 0.6,
    maxAsteroids: 200,
    trailLength: 240,
    pixelRatioCap: 1.5,
    shadows: false,
    adaptiveQuality: true,
    targetFps: 60,
  },
  units: 'si',
  precision: 3,
};

export const DEFAULT_LAYERS: LayerConfiguration = {
  starfield: { visible: true, opacity: 1, intensity: 1 },
  bodies: { visible: true, opacity: 1, intensity: 1 },
  orbits: { visible: true, opacity: 0.5, intensity: 1 },
  trails: { visible: true, opacity: 0.7, intensity: 1 },
  'velocity-vectors': { visible: false, opacity: 0.9, intensity: 1 },
  'acceleration-vectors': { visible: false, opacity: 0.9, intensity: 1 },
  'gravity-vectors': { visible: false, opacity: 0.7, intensity: 1 },
  barycenter: { visible: false, opacity: 1, intensity: 1 },
  labels: { visible: true, opacity: 1, intensity: 1 },
  grid: { visible: true, opacity: 0.25, intensity: 1 },
  'asteroid-belts': { visible: true, opacity: 1, intensity: 1 },
  spacetime: { visible: false, opacity: 0.7, intensity: 1 },
  'comet-tails': { visible: true, opacity: 0.8, intensity: 1 },
};

export const SPEED_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 25, 50];

export const DEFAULT_UNIVERSE_SETTINGS = {
  G,
  softening: 1e5,
  timestep: 3600,
  integrator: 'velocity-verlet',
  collisionMode: 'none' as const,
  collisionsEnabled: false,
  timeScale: 3600,
};
