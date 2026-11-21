import type { IntegratorId } from './celestial';
import type { PerformanceSettings } from './visualization';

export interface AppSettings {
  theme: 'dark' | 'midnight' | 'slate';
  reduceMotion: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showFps: boolean;
  panelAnimations: boolean;
  integrator: IntegratorId;
  timestep: number;
  timeScale: number;
  cameraDamping: number;
  cameraDistance: number;
  autoFollow: boolean;
  performance: PerformanceSettings;
  units: 'si' | 'astronomical';
  precision: number;
}
