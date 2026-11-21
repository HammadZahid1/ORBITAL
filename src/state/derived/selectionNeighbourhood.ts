/** Parent/child/sibling context and nearest spatial neighbours for a selection. */

import type { PhysicsWorld } from '../../engine/physics/world';
import type { CelestialBody } from '../../types/celestial';
import { findBodyById } from './bodyIndex';
import { siblingIdsOf } from './siblingGroups';
import {
  boundedLimit,
  childrenIndexMap,
  compareIds,
  distanceBetween,
  finiteNumber,
  worldIdAt,
  worldIndexMap,
  worldPosition,
  worldSize,
} from './internal';

export interface SpatialNeighbour {
  id: string;
  /** Finite centre-to-centre distance from the selected body, metres. */
  distance: number;
}

export interface SelectionNeighbourhood {
  selectedId: string | null;
  parentId: string | null;
  childIds: string[];
  siblingIds: string[];
  /** Nearest valid world bodies, excluding the selected body. */
  neighbours: SpatialNeighbour[];
}

export interface SelectionNeighbourhoodOptions {
  /** Number of spatial neighbours to keep (default 3). */
  nearest?: number;
  /** Optional maximum spatial neighbour distance. */
  maxDistance?: number;
}

/** Hierarchical and spatial neighbourhood of a selected body ID. */
export function selectionNeighbourhood(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  selectedId: string,
  options: SelectionNeighbourhoodOptions = {},
): SelectionNeighbourhood {
  const empty: SelectionNeighbourhood = {
    selectedId: null,
    parentId: null,
    childIds: [],
    siblingIds: [],
    neighbours: [],
  };
  const body = findBodyById(bodies, selectedId);
  if (!body) return empty;

  const index = new Map<string, number>();
  bodies.forEach((candidate, at) => {
    if (candidate && !index.has(candidate.id)) index.set(candidate.id, at);
  });
  const at = index.get(selectedId)!;
  const parentId = typeof body.parentId === 'string' && index.has(body.parentId) ? body.parentId : null;
  const childIds = (childrenIndexMap(bodies, index).get(at) ?? [])
    .map((childIndex) => bodies[childIndex]?.id)
    .filter((id): id is string => typeof id === 'string');

  const worldById = worldIndexMap(world);
  const selectedWorldIndex = worldById.get(selectedId);
  const selectedPosition = selectedWorldIndex === undefined ? null : worldPosition(world, selectedWorldIndex);
  const maxDistance =
    finiteNumber(options.maxDistance) !== null && options.maxDistance! >= 0
      ? options.maxDistance!
      : Number.POSITIVE_INFINITY;
  const neighbours: SpatialNeighbour[] = [];
  if (selectedPosition) {
    for (let slot = 0; slot < worldSize(world); slot += 1) {
      const id = worldIdAt(world, slot);
      if (!id || id === selectedId) continue;
      const position = worldPosition(world, slot);
      if (!position) continue;
      const distance = distanceBetween(selectedPosition, position);
      if (distance > maxDistance) continue;
      neighbours.push({ id, distance });
    }
  }
  neighbours.sort((left, right) => left.distance - right.distance || compareIds(left.id, right.id));
  const nearest = boundedLimit(options.nearest, 3);

  return {
    selectedId,
    parentId,
    childIds,
    siblingIds: siblingIdsOf(bodies, selectedId),
    neighbours: neighbours.slice(0, nearest),
  };
}

/** IDs of the nearest spatial neighbours of a selection. */
export function nearestNeighbourIds(
  world: PhysicsWorld,
  bodies: readonly CelestialBody[],
  selectedId: string,
  options: SelectionNeighbourhoodOptions = {},
): string[] {
  return selectionNeighbourhood(world, bodies, selectedId, options).neighbours.map((entry) => entry.id);
}
