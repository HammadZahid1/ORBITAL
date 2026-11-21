import type { ModuleId } from '../types/celestial';

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  shortLabel: string;
  description: string;
  group: 'explore' | 'construct' | 'analyse' | 'library';
}

/** Single source of truth for navigation, command palette and help text. */
export const MODULES: ModuleDefinition[] = [
  {
    id: 'explorer',
    label: 'Universe Explorer',
    shortLabel: 'Explorer',
    description: 'Fly through the live 3D universe and inspect every body.',
    group: 'explore',
  },
  {
    id: 'solar-system',
    label: 'Solar System',
    shortLabel: 'Solar',
    description: 'Explore the initialised solar system and its planetary families.',
    group: 'explore',
  },
  {
    id: 'orbital',
    label: 'Orbital Mechanics',
    shortLabel: 'Orbits',
    description: 'Inspect osculating elements, transfers and trajectory predictions.',
    group: 'analyse',
  },
  {
    id: 'gravity',
    label: 'Gravity Lab',
    shortLabel: 'Gravity',
    description: 'Run controlled N-body experiments and compare gravitational fields.',
    group: 'analyse',
  },
  {
    id: 'builder',
    label: 'Universe Builder',
    shortLabel: 'Builder',
    description: 'Create bodies, assign orbital initial conditions and edit properties.',
    group: 'construct',
  },
  {
    id: 'asteroids',
    label: 'Asteroid Observatory',
    shortLabel: 'Asteroids',
    description: 'Track small bodies, impact risks and resonant populations.',
    group: 'analyse',
  },
  {
    id: 'stellar',
    label: 'Stellar Systems',
    shortLabel: 'Stellar',
    description: 'Study binaries, barycentres and stellar mass hierarchies.',
    group: 'explore',
  },
  {
    id: 'extreme',
    label: 'Extreme Physics',
    shortLabel: 'Extreme',
    description: 'Explore close encounters, escapes and compact-object approximations.',
    group: 'analyse',
  },
  {
    id: 'mission',
    label: 'Mission Lab',
    shortLabel: 'Mission',
    description: 'Design transfer burns and evaluate intercept opportunities.',
    group: 'construct',
  },
  {
    id: 'analytics',
    label: 'Analysis',
    shortLabel: 'Analysis',
    description: 'Chart energy, momentum, stability and solver performance.',
    group: 'analyse',
  },
  {
    id: 'saved',
    label: 'Saved Universes',
    shortLabel: 'Saved',
    description: 'Load scenarios, manage local saves and import or export JSON.',
    group: 'library',
  },
];

export const MODULE_BY_ID = new Map(MODULES.map((module) => [module.id, module]));

export function moduleLabel(id: ModuleId): string {
  return MODULE_BY_ID.get(id)?.label ?? id;
}
