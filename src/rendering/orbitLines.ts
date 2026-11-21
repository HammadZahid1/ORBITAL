/** Colour and opacity rules for orbit guidance curves. */

import { clamp, finiteOr } from '../engine/numeric';
import { hexToRgb, luminance } from './color';

export type OrbitEmphasis = 'normal' | 'selected' | 'hovered' | 'parent';

/** Kept in sync with the colours used by the orbit path component. */
export const ORBIT_LINE_COLORS: Record<OrbitEmphasis, string> = {
  normal: '#6b8eb5',
  selected: '#55e0e8',
  hovered: '#8bd7dd',
  parent: '#9db4cf',
};

export const ORBIT_LINE_OPACITY: Record<OrbitEmphasis, number> = {
  normal: 0.4,
  selected: 0.85,
  hovered: 0.62,
  parent: 0.5,
};

/** Resolves selection/hover priority for an orbit line. */
export function orbitEmphasis(
  bodyId: string,
  selectedId: string | null,
  hoveredId: string | null,
  isParent = false,
): OrbitEmphasis {
  if (selectedId === bodyId) return 'selected';
  if (hoveredId === bodyId) return 'hovered';
  return isParent ? 'parent' : 'normal';
}

export interface OrbitLineStyle {
  color: string;
  opacity: number;
}

/** Line style scaled by the orbits layer opacity. */
export function orbitLineStyle(emphasis: OrbitEmphasis, layerOpacity = 1): OrbitLineStyle {
  const key: OrbitEmphasis = emphasis in ORBIT_LINE_COLORS ? emphasis : 'normal';
  return {
    color: ORBIT_LINE_COLORS[key],
    opacity: clamp(ORBIT_LINE_OPACITY[key] * clamp(finiteOr(layerOpacity, 0), 0, 1), 0, 1),
  };
}

/** Relative brightness, useful for asserting highlighted orbits stand out. */
export function orbitLineBrightness(emphasis: OrbitEmphasis): number {
  const key: OrbitEmphasis = emphasis in ORBIT_LINE_COLORS ? emphasis : 'normal';
  return luminance(hexToRgb(ORBIT_LINE_COLORS[key]));
}
