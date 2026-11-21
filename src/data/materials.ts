import type { BodyType, MaterialPreset } from '../types/celestial';

export interface MaterialDefinition {
  id: MaterialPreset;
  label: string;
  description: string;
  baseColor: string;
  accentColor: string;
  roughness: number;
  emissive: boolean;
  atmosphere: boolean;
}

export const MATERIALS: Record<MaterialPreset, MaterialDefinition> = {
  rocky: {
    id: 'rocky',
    label: 'Rocky',
    description: 'Cratered silicate surface, procedurally generated.',
    baseColor: '#9b8b7e',
    accentColor: '#4d423b',
    roughness: 0.95,
    emissive: false,
    atmosphere: false,
  },
  desert: {
    id: 'desert',
    label: 'Desert',
    description: 'Warm arid world with dune-like variation.',
    baseColor: '#d3a067',
    accentColor: '#7c4d2d',
    roughness: 0.9,
    emissive: false,
    atmosphere: true,
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Water-covered world with continental variation.',
    baseColor: '#2f78a8',
    accentColor: '#3f8f5f',
    roughness: 0.55,
    emissive: false,
    atmosphere: true,
  },
  ice: {
    id: 'ice',
    label: 'Ice',
    description: 'Frozen world with bright reflective terrain.',
    baseColor: '#bcd9e6',
    accentColor: '#6d9db3',
    roughness: 0.7,
    emissive: false,
    atmosphere: true,
  },
  'gas-giant': {
    id: 'gas-giant',
    label: 'Gas Giant',
    description: 'Banded atmosphere, no solid surface.',
    baseColor: '#c8a37a',
    accentColor: '#7b5b45',
    roughness: 1,
    emissive: false,
    atmosphere: true,
  },
  clouded: {
    id: 'clouded',
    label: 'Clouded',
    description: 'Dense cloud deck over an obscured surface.',
    baseColor: '#d9e1e8',
    accentColor: '#8fa3b8',
    roughness: 1,
    emissive: false,
    atmosphere: true,
  },
  volcanic: {
    id: 'volcanic',
    label: 'Volcanic',
    description: 'Dark crust with glowing fissures.',
    baseColor: '#3b2a28',
    accentColor: '#ff6a32',
    roughness: 0.85,
    emissive: true,
    atmosphere: false,
  },
  star: {
    id: 'star',
    label: 'Star',
    description: 'Self-luminous plasma sphere.',
    baseColor: '#ffd58a',
    accentColor: '#ff7d2e',
    roughness: 1,
    emissive: true,
    atmosphere: true,
  },
  metal: {
    id: 'metal',
    label: 'Metallic',
    description: 'High-reflectivity artificial or metallic body.',
    baseColor: '#a9b5c2',
    accentColor: '#4a5666',
    roughness: 0.35,
    emissive: false,
    atmosphere: false,
  },
  comet: {
    id: 'comet',
    label: 'Comet',
    description: 'Icy nucleus with an illustrative sublimation tail.',
    baseColor: '#c9e5ee',
    accentColor: '#7fb6cb',
    roughness: 0.8,
    emissive: false,
    atmosphere: true,
  },
  singularity: {
    id: 'singularity',
    label: 'Singularity',
    description: 'Illustrative black hole visual model.',
    baseColor: '#050508',
    accentColor: '#ff9a3c',
    roughness: 1,
    emissive: false,
    atmosphere: false,
  },
};

export const MATERIAL_LIST = Object.values(MATERIALS);

export const TYPE_COLORS: Record<BodyType, string> = {
  star: '#ffd58a',
  planet: '#59b9e8',
  dwarf: '#9d9fd0',
  moon: '#b8bcbf',
  asteroid: '#a08f78',
  comet: '#9fd8e8',
  custom: '#c084fc',
  blackhole: '#f59e42',
};

export function suggestedMaterial(type: BodyType): MaterialPreset {
  switch (type) {
    case 'star':
      return 'star';
    case 'comet':
      return 'comet';
    case 'blackhole':
      return 'singularity';
    case 'asteroid':
      return 'rocky';
    case 'moon':
      return 'rocky';
    default:
      return 'rocky';
  }
}
