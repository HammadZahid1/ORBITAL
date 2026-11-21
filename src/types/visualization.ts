/** Layers that can be toggled independently in the 3D viewport. */
export type LayerId =
  | 'starfield'
  | 'bodies'
  | 'orbits'
  | 'trails'
  | 'velocity-vectors'
  | 'acceleration-vectors'
  | 'gravity-vectors'
  | 'barycenter'
  | 'labels'
  | 'grid'
  | 'asteroid-belts'
  | 'spacetime'
  | 'comet-tails';

export interface LayerState {
  visible: boolean;
  opacity: number;
  intensity: number;
}

export type LayerConfiguration = Record<LayerId, LayerState>;

export type RenderQuality = 'low' | 'balanced' | 'high' | 'custom';

export interface PerformanceSettings {
  quality: RenderQuality;
  particleDensity: number;
  maxAsteroids: number;
  trailLength: number;
  pixelRatioCap: number;
  shadows: boolean;
  adaptiveQuality: boolean;
  targetFps: number;
}
