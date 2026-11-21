/**
 * Pure derived-state selectors.
 *
 * Every module in this directory derives read-only information from
 * `PhysicsWorld` and/or `CelestialBody[]`. Nothing here imports React, Zustand
 * or browser APIs, and every numeric result is finite-safe.
 */

export * from './internal';
export * from './bodyIndex';
export * from './parentChain';
export * from './descendants';
export * from './hierarchyTree';
export * from './siblingGroups';
export * from './subtreeMass';
export * from './subtreeBarycentre';
export * from './hillRadius';
export * from './mutualHillSpacing';
export * from './relativeVelocity';
export * from './relativeSpeedRanking';
export * from './escapeFlags';
export * from './orbitalEnergy';
export * from './collisionCandidates';
export * from './closePairRanking';
export * from './massRatioRanking';
export * from './radiusRatioRanking';
export * from './bodyTags';
export * from './selectionNeighbourhood';
export * from './visibleBodies';
