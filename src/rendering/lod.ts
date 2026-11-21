/** Level-of-detail thresholds and geometry budgets keyed by scene radius. */

import { finiteOr } from '../engine/numeric';
import type { LodGeometry, LodTier } from './types';

export const LOD_RANK: Record<LodTier, number> = {
  impostor: 0,
  low: 1,
  medium: 2,
  high: 3,
};

/** Ascending minimum scene radii for each tier. */
export const LOD_THRESHOLDS: readonly { tier: LodTier; minRadius: number }[] = [
  { tier: 'impostor', minRadius: 0 },
  { tier: 'low', minRadius: 0.12 },
  { tier: 'medium', minRadius: 0.6 },
  { tier: 'high', minRadius: 1 },
];

export const LOD_GEOMETRY: Record<LodTier, LodGeometry> = {
  impostor: { segments: 8, rings: 6, ringSegments: 24, atmosphereSegments: 8 },
  low: { segments: 24, rings: 16, ringSegments: 48, atmosphereSegments: 16 },
  medium: { segments: 32, rings: 24, ringSegments: 72, atmosphereSegments: 20 },
  high: { segments: 48, rings: 32, ringSegments: 96, atmosphereSegments: 24 },
};

/** Chooses the highest tier whose threshold is met by the scene radius. */
export function lodTierForRadius(radius: number): LodTier {
  const value = Math.max(finiteOr(radius, 0), 0);
  let tier: LodTier = 'impostor';
  for (const entry of LOD_THRESHOLDS) {
    if (value >= entry.minRadius) tier = entry.tier;
  }
  return tier;
}

/** Defensive copy of the resolution for a scene radius. */
export function lodGeometryForRadius(radius: number): LodGeometry {
  return { ...LOD_GEOMETRY[lodTierForRadius(radius)] };
}

/** Numeric ordering used by monotonicity checks and quality comparisons. */
export function lodRank(tier: LodTier): number {
  return LOD_RANK[tier] ?? 0;
}

/** Approximate vertex budget for the chosen sphere, ring and halo geometry. */
export function tessellationBudget(radius: number): number {
  const geometry = lodGeometryForRadius(radius);
  return geometry.segments * geometry.rings + geometry.ringSegments + geometry.atmosphereSegments;
}
