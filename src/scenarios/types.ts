import type { Universe } from '../types/celestial';
import type { LayerId } from '../types/visualization';

export interface CameraConfiguration {
  /** Camera position in scene units (not metres). */
  position: [number, number, number];
  target: [number, number, number];
  suggestedDistance: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: 'solar' | 'orbital' | 'stellar' | 'experiments' | 'extreme' | 'custom';
  educationalNotes: string;
  universe: Universe;
  camera: CameraConfiguration;
  layers: Partial<Record<LayerId, boolean>>;
  tags: string[];
}
