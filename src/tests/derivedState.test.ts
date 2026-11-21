import { describe, expect, it } from 'vitest';
import { createBody, type BodyOptions } from '../data/bodyFactory';
import { G } from '../engine/numeric';
import { createPhysicsWorld, worldFromBodies } from '../engine/physics/world';
import * as derived from '../state/derived';

function makeBody(id: string, options: Partial<BodyOptions> = {}) {
  return createBody({ id, name: options.name ?? id, ...options });
}

function makeWorld(bodies: readonly ReturnType<typeof makeBody>[]) {
  return worldFromBodies([...bodies], { G, softening: 0 });
}

function solarSystem() {
  const bodies = [
    makeBody('sun', { type: 'star', mass: 1e30, radius: 1e9, position: { x: 0, y: 0, z: 0 } }),
    makeBody('venus', {
      parentId: 'sun',
      type: 'planet',
      mass: 4.8e24,
      radius: 6e6,
      position: { x: 0.7e11, y: 0, z: 0 },
      velocity: { x: 0, y: 1.2e4, z: 0 },
      notes: '#inner rocky #morning',
    }),
    makeBody('earth', {
      parentId: 'sun',
      type: 'planet',
      mass: 6e24,
      radius: 6e6,
      position: { x: 1e11, y: 0, z: 0 },
      velocity: { x: 0, y: 1e4, z: 0 },
      notes: '#inner #rocky home',
    }),
    makeBody('mars', {
      parentId: 'sun',
      type: 'planet',
      mass: 6e23,
      radius: 3e6,
      position: { x: 1.5e11, y: 0, z: 0 },
      velocity: { x: 0, y: 8e3, z: 0 },
      notes: '#outer',
    }),
    makeBody('moon', {
      parentId: 'earth',
      type: 'moon',
      mass: 7e22,
      radius: 1.7e6,
      position: { x: 1e11 + 4e8, y: 0, z: 0 },
      velocity: { x: 0, y: 1.1e4, z: 0 },
    }),
    makeBody('probe', {
      parentId: 'moon',
      type: 'custom',
      mass: 1e3,
      radius: 2,
      position: { x: 1e11 + 4e8 + 1e6, y: 0, z: 0 },
      velocity: { x: 0, y: 1.2e4, z: 0 },
      locked: true,
      notes: '#mission',
    }),
  ];
  return { bodies, world: makeWorld(bodies) };
}

function deepChain(length: number) {
  const bodies: ReturnType<typeof makeBody>[] = [];
  for (let i = 0; i < length; i += 1) {
    bodies.push(makeBody(`node-${i}`, { parentId: i === 0 ? null : `node-${i - 1}` }));
  }
  return { bodies, world: makeWorld(bodies) };
}

function flatten(nodes: derived.HierarchyNode[]): derived.HierarchyNode[] {
  const result: derived.HierarchyNode[] = [];
  const pending = [...nodes];
  while (pending.length > 0) {
    const node = pending.pop()!;
    result.push(node);
    pending.push(...node.children);
  }
  return result;
}

describe('derived body index lookups', () => {
  it('builds an empty index and reports missing ids', () => {
    expect(derived.buildBodyIndex([]).size).toBe(0);
    expect(derived.findBodyIndex([], 'nope')).toBe(-1);
    expect(derived.findBodyById([], 'nope')).toBeNull();
    expect(derived.uniqueBodyIds([])).toEqual([]);
  });

  it('finds body definitions and keeps the first duplicate id', () => {
    const first = makeBody('dup', { name: 'first' });
    const second = makeBody('dup', { name: 'second' });
    const bodies = [first, second];
    expect(derived.findBodyIndex(bodies, 'dup')).toBe(0);
    expect(derived.findBodyById(bodies, 'dup')?.name).toBe('first');
    expect(derived.uniqueBodyIds(bodies)).toEqual(['dup']);
  });

  it('maps world ids to slots and clamps malformed counts', () => {
    const world = createPhysicsWorld(1);
    world.count = 99;
    world.ids.push('only');
    expect(derived.worldBodyCount(world)).toBe(1);
    expect(derived.findWorldBodyIndex(world, 'only')).toBe(0);
    expect(derived.findWorldBodyIndex(world, 'missing')).toBe(-1);
    expect(derived.worldBodyId(world, 0)).toBe('only');
    expect(derived.worldBodyId(world, 4)).toBeNull();
  });

  it('ignores malformed world ids', () => {
    const world = createPhysicsWorld(1);
    world.count = 1;
    world.ids.push(7 as unknown as string);
    expect(derived.worldBodyId(world, 0)).toBeNull();
    expect(derived.buildWorldIndex(world).size).toBe(0);
  });
});

describe('derived parent chains', () => {
  it('walks a chain from body to root', () => {
    const { bodies } = solarSystem();
    expect(derived.parentChainIds(bodies, 'probe')).toEqual(['probe', 'moon', 'earth', 'sun']);
    expect(derived.ancestryDepth(bodies, 'probe')).toBe(3);
    expect(derived.ancestryDepth(bodies, 'sun')).toBe(0);
  });

  it('stops at a missing parent', () => {
    const bodies = [makeBody('orphan', { parentId: 'gone' }), makeBody('root')];
    expect(derived.parentChainIds(bodies, 'orphan')).toEqual(['orphan']);
    expect(derived.hasAncestor(bodies, 'orphan', 'gone')).toBe(false);
  });

  it('terminates on a two-body cycle', () => {
    const bodies = [makeBody('a', { parentId: 'b' }), makeBody('b', { parentId: 'a' })];
    expect(derived.parentChainIds(bodies, 'a')).toEqual(['a', 'b']);
    expect(derived.parentChainIds(bodies, 'b')).toEqual(['b', 'a']);
  });

  it('terminates on a self-parent and a missing id', () => {
    const bodies = [makeBody('self', { parentId: 'self' })];
    expect(derived.parentChainIds(bodies, 'self')).toEqual(['self']);
    expect(derived.parentChain(bodies, 'missing')).toEqual([]);
    expect(derived.ancestryDepth(bodies, 'missing')).toBe(0);
  });

  it('detects ancestry across a deep hierarchy', () => {
    const { bodies } = deepChain(1500);
    expect(derived.parentChain(bodies, 'node-1499')).toHaveLength(1500);
    expect(derived.ancestryDepth(bodies, 'node-1499')).toBe(1499);
    expect(derived.hasAncestor(bodies, 'node-1499', 'node-0')).toBe(true);
    expect(derived.hasAncestor(bodies, 'node-100', 'node-1499')).toBe(false);
  });
});

describe('derived descendants and subtree membership', () => {
  it('lists descendants with and without the root', () => {
    const { bodies } = solarSystem();
    expect(derived.descendantsOf(bodies, 'earth').map((body) => body.id)).toEqual(['moon', 'probe']);
    expect(derived.subtreeIds(bodies, 'earth', { includeRoot: true })).toEqual(['earth', 'moon', 'probe']);
  });

  it('tests descendant membership without treating a body as its own descendant', () => {
    const { bodies } = solarSystem();
    expect(derived.isDescendantOf(bodies, 'probe', 'sun')).toBe(true);
    expect(derived.isDescendantOf(bodies, 'sun', 'probe')).toBe(false);
    expect(derived.isDescendantOf(bodies, 'sun', 'sun')).toBe(false);
  });

  it('returns empty subtrees for missing ids', () => {
    const { bodies } = solarSystem();
    expect(derived.descendantsOf(bodies, 'missing')).toEqual([]);
    expect(derived.subtreeIds(bodies, 'missing', { includeRoot: true })).toEqual([]);
    expect(derived.subtreeSize(bodies, 'missing')).toBe(0);
  });

  it('does not loop forever inside a cycle', () => {
    const bodies = [
      makeBody('a', { parentId: 'b' }),
      makeBody('b', { parentId: 'c' }),
      makeBody('c', { parentId: 'a' }),
    ];
    const ids = derived.descendantsOf(bodies, 'a').map((body) => body.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids)).toEqual(new Set(['b', 'c']));
  });

  it('counts deep subtrees iteratively', () => {
    const { bodies } = deepChain(1200);
    expect(derived.subtreeSize(bodies, 'node-0')).toBe(1200);
    expect(derived.descendantsOf(bodies, 'node-1199')).toEqual([]);
  });
});

describe('derived hierarchy trees', () => {
  it('builds the expected root and nesting structure', () => {
    const { bodies } = solarSystem();
    const roots = derived.buildHierarchyTree(bodies);
    expect(roots.map((node) => node.id)).toEqual(['sun']);
    expect(roots[0].children.map((node) => node.id)).toEqual(['venus', 'earth', 'mars']);
    const earth = roots[0].children[1];
    expect(earth.depth).toBe(1);
    expect(earth.children[0].id).toBe('moon');
    expect(earth.children[0].children[0].id).toBe('probe');
    expect(earth.children[0].children[0].depth).toBe(3);
  });

  it('promotes missing and self-referential parents to roots', () => {
    const bodies = [
      makeBody('root'),
      makeBody('orphan', { parentId: 'gone' }),
      makeBody('self', { parentId: 'self' }),
    ];
    expect(derived.buildHierarchyTree(bodies).map((node) => node.id)).toEqual(['root', 'orphan', 'self']);
  });

  it('breaks a cycle without dropping any member', () => {
    const bodies = [
      makeBody('a', { parentId: 'b' }),
      makeBody('b', { parentId: 'c' }),
      makeBody('c', { parentId: 'a' }),
      makeBody('leaf', { parentId: 'b' }),
    ];
    const roots = derived.buildHierarchyTree(bodies);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('a');
    const nodes = flatten(roots);
    expect(nodes.map((node) => node.id).sort()).toEqual(['a', 'b', 'c', 'leaf']);
    expect(nodes.every((node) => node.children.every((child) => child.depth === node.depth + 1))).toBe(true);
    expect(new Set(nodes.map((node) => node.depth))).toEqual(new Set([0, 1, 2]));
  });

  it('handles a deep hierarchy without recursion overflow', () => {
    const { bodies } = deepChain(2500);
    const roots = derived.buildHierarchyTree(bodies);
    expect(roots).toHaveLength(1);
    expect(derived.maxHierarchyDepth(bodies)).toBe(2499);
    expect(flatten(roots)).toHaveLength(2500);
  });

  it('returns an empty tree for an empty body list', () => {
    expect(derived.buildHierarchyTree([])).toEqual([]);
    expect(derived.maxHierarchyDepth([])).toBe(-1);
  });
});

describe('derived sibling groups', () => {
  it('groups siblings by resolved parent', () => {
    const { bodies } = solarSystem();
    const groups = derived.siblingGroups(bodies);
    expect(groups.get('sun')?.map((body) => body.id)).toEqual(['venus', 'earth', 'mars']);
    expect(groups.get('earth')?.map((body) => body.id)).toEqual(['moon']);
    expect(groups.get('moon')?.map((body) => body.id)).toEqual(['probe']);
  });

  it('returns siblings excluding the selected body', () => {
    const { bodies } = solarSystem();
    expect(derived.siblingsOf(bodies, 'earth').map((body) => body.id)).toEqual(['venus', 'mars']);
    expect(derived.siblingIdsOf(bodies, 'earth', { includeSelf: true })).toContain('earth');
    expect(derived.siblingsOf(bodies, 'probe')).toEqual([]);
  });

  it('groups unresolved parents under the root key and handles missing ids', () => {
    const bodies = [makeBody('a'), makeBody('b', { parentId: 'gone' })];
    expect(derived.siblingGroups(bodies).get(null)?.map((body) => body.id)).toEqual(['a', 'b']);
    expect(derived.siblingsOf(bodies, 'missing')).toEqual([]);
  });
});

describe('derived subtree mass and barycentre', () => {
  it('sums finite positive world masses in a subtree', () => {
    const { bodies, world } = solarSystem();
    expect(derived.subtreeMass(world, bodies, 'earth')).toBeCloseTo(6e24 + 7e22 + 1e3, 0);
    expect(derived.subtreeMass(world, bodies, 'sun')).toBeCloseTo(
      1e30 + 4.8e24 + 6e24 + 6e23 + 7e22 + 1e3,
      0,
    );
  });

  it('returns zero for missing subtrees and ignores non-finite masses', () => {
    const { bodies, world } = solarSystem();
    expect(derived.subtreeMass(world, bodies, 'missing')).toBe(0);
    const moonIndex = derived.findWorldBodyIndex(world, 'moon');
    world.mass[moonIndex] = Number.NaN;
    expect(derived.subtreeMass(world, bodies, 'earth')).toBeCloseTo(6e24 + 1e3, 0);
    world.mass[moonIndex] = Number.POSITIVE_INFINITY;
    expect(derived.subtreeMass(world, bodies, 'earth')).toBeCloseTo(6e24 + 1e3, 0);
  });

  it('builds a mass map for every unique body', () => {
    const { bodies, world } = solarSystem();
    const masses = derived.massBySubtree(world, bodies);
    expect(masses.size).toBe(6);
    expect(masses.get('sun')).toBeCloseTo(1e30, 0);
    expect(masses.get('missing')).toBeUndefined();
  });

  it('computes a mass-weighted barycentre', () => {
    const bodies = [makeBody('a'), makeBody('b')];
    const world = makeWorld(bodies);
    world.pos.set([0, 0, 0, 10, 0, 0]);
    const result = derived.barycentreOfIds(world, bodies, ['a', 'b']);
    expect(result?.mass).toBeCloseTo(bodies[0].physical.mass * 2, 0);
    expect(result?.position.x).toBeCloseTo(5, 10);
    expect(result?.position.y).toBe(0);
    expect(Number.isFinite(result?.position.z)).toBe(true);
  });

  it('returns null for unknown, massless or non-finite barycentre inputs', () => {
    const { bodies, world } = solarSystem();
    expect(derived.subtreeBarycentre(world, bodies, 'missing')).toBeNull();
    expect(derived.weightedBarycentre([])).toBeNull();
    const lone = [makeBody('lone', { mass: 0 })];
    expect(derived.systemBarycentre(makeWorld(lone), lone)).toBeNull();
    const moonIndex = derived.findWorldBodyIndex(world, 'moon');
    world.pos[moonIndex * 3] = Number.NaN;
    const earthBarycentre = derived.subtreeBarycentre(world, bodies, 'earth');
    expect(earthBarycentre?.position.x).toBeCloseTo(1e11, 2);
    world.pos[derived.findWorldBodyIndex(world, 'probe') * 3] = Number.POSITIVE_INFINITY;
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    expect(derived.subtreeBarycentre(world, bodies, 'earth')?.position.x).toBeCloseTo(1e11, 2);
    world.pos[earthIndex * 3] = Number.NaN;
    expect(derived.subtreeBarycentre(world, bodies, 'earth')).toBeNull();
  });
});

describe('derived Hill radii and mutual spacing', () => {
  it('computes a finite Hill radius per body and skips roots', () => {
    const { bodies, world } = solarSystem();
    const radius = derived.hillRadius(world, bodies, 'earth')!;
    const expected = 1e11 * Math.cbrt(6e24 / (3 * (1e30 + 6e24)));
    expect(radius / expected).toBeCloseTo(1, 9);
    expect(derived.hillRadius(world, bodies, 'sun')).toBeNull();
    expect(derived.hillRadii(world, bodies).has('earth')).toBe(true);
    expect(derived.hillRadii(world, bodies).has('sun')).toBe(false);
  });

  it('returns null for missing parents, zero separation and non-finite state', () => {
    const { bodies, world } = solarSystem();
    expect(derived.hillRadius(world, bodies, 'missing')).toBeNull();
    expect(derived.hillRadius(world, [makeBody('solo')], 'solo')).toBeNull();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.pos[earthIndex * 3] = Number.NaN;
    expect(derived.hillRadius(world, bodies, 'earth')).toBeNull();
    world.pos[earthIndex * 3] = 0;
    world.mass[earthIndex] = Number.POSITIVE_INFINITY;
    expect(derived.hillRadius(world, bodies, 'earth')).toBeNull();
  });

  it('computes mutual Hill radii and spacing', () => {
    const { bodies, world } = solarSystem();
    const mutual = derived.mutualHillRadius(world, bodies, 'earth', 'venus')!;
    expect(mutual).toBeGreaterThan(0);
    expect(mutual).toBeCloseTo(
      (derived.hillRadius(world, bodies, 'earth')! + derived.hillRadius(world, bodies, 'venus')!) / 2,
      0,
    );
    expect(derived.mutualHillSpacing(world, bodies, 'earth', 'venus')).toBeGreaterThan(0);
    expect(derived.mutualHillRadius(world, bodies, 'earth', 'earth')).toBeNull();
    expect(derived.mutualHillSpacing(world, bodies, 'earth', 'missing')).toBeNull();
  });

  it('ranks sibling spacings from tightest to widest', () => {
    const { bodies, world } = solarSystem();
    const ranked = derived.rankMutualHillSpacings(world, bodies);
    expect(ranked).toHaveLength(3);
    expect(ranked.every((pair) => pair.spacing !== null && Number.isFinite(pair.spacing))).toBe(true);
    for (let i = 1; i < ranked.length; i += 1) expect(ranked[i - 1].spacing!).toBeLessThanOrEqual(ranked[i].spacing!);
  });

  it('keeps mutual spacing finite-safe with invalid positions', () => {
    const { bodies, world } = solarSystem();
    const venusIndex = derived.findWorldBodyIndex(world, 'venus');
    world.pos[venusIndex * 3 + 1] = Number.NaN;
    expect(derived.mutualHillSpacing(world, bodies, 'earth', 'venus')).toBeNull();
    expect(derived.rankMutualHillSpacings(world, bodies).some((pair) => pair.spacing === null)).toBe(true);
  });
});

describe('derived relative velocity and speed ranking', () => {
  it('subtracts parent velocity and handles missing relationships', () => {
    const { bodies, world } = solarSystem();
    expect(derived.relativeVelocityToParent(world, bodies, 'earth')).toEqual({ x: 0, y: 1e4, z: 0 });
    expect(derived.relativeSpeedToParent(world, bodies, 'earth')).toBeCloseTo(1e4, 6);
    expect(derived.relativeVelocityToParent(world, bodies, 'sun')).toBeNull();
    expect(derived.relativeVelocityToParent(world, bodies, 'missing')).toBeNull();
    expect(derived.relativeVelocitiesToParents(world, bodies).size).toBe(5);
  });

  it('ranks relative speeds deterministically with invalid entries last', () => {
    const { bodies, world } = solarSystem();
    const ranked = derived.rankRelativeSpeeds(world, bodies);
    expect(ranked.map((entry) => entry.id)).toEqual([
      'venus',
      'earth',
      'mars',
      'moon',
      'probe',
      'sun',
    ]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ranked[0].speed).toBeCloseTo(1.2e4, 6);
    expect(ranked.at(-1)).toMatchObject({ id: 'sun', speed: 0, valid: false });
    expect(derived.fastestRelativeBody(world, bodies)).toBe('venus');
  });

  it('applies a finite limit to speed rankings', () => {
    const { bodies, world } = solarSystem();
    expect(derived.topRelativeSpeeds(world, bodies, 2).map((entry) => entry.id)).toEqual(['venus', 'earth']);
    expect(derived.topRelativeSpeeds(world, bodies, -1)).toEqual([]);
    expect(derived.topRelativeSpeeds(world, bodies, Number.NaN)).toEqual([]);
  });

  it('treats non-finite velocities as invalid, not infinite', () => {
    const { bodies, world } = solarSystem();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.vel[earthIndex * 3 + 1] = Number.NaN;
    expect(derived.relativeVelocityToParent(world, bodies, 'earth')).toBeNull();
    const entry = derived.rankRelativeSpeeds(world, bodies).find((item) => item.id === 'earth')!;
    expect(entry.valid).toBe(false);
    expect(entry.speed).toBe(0);
    expect(Number.isFinite(entry.rank)).toBe(true);
  });
});

describe('derived escape flags', () => {
  it('marks bound orbits as not escaping', () => {
    const { bodies, world } = solarSystem();
    const flag = derived.escapeFlagForBody(world, bodies, 'earth')!;
    expect(flag.escaped).toBe(false);
    expect(flag.specificEnergy!).toBeLessThan(0);
    expect(flag.escapeSpeed!).toBeGreaterThan(1e4);
  });

  it('marks unbound orbits as escaping and honours outwardOnly', () => {
    const { bodies, world } = solarSystem();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.vel[earthIndex * 3 + 1] = 5e4;
    const flag = derived.escapeFlagForBody(world, bodies, 'earth')!;
    expect(flag.specificEnergy!).toBeGreaterThan(0);
    expect(flag.escaped).toBe(true);
    expect(flag.radialSpeed).not.toBeNull();
    expect(derived.escapeFlagForBody(world, bodies, 'earth', { outwardOnly: true })!.escaped).toBe(false);
    expect(derived.escapeFlagForBody(world, bodies, 'earth', { energyMargin: 1e12 })!.escaped).toBe(false);
    expect(derived.escapingBodyIds(world, bodies)).toContain('earth');
  });

  it('returns safe flags for roots and missing ids', () => {
    const { bodies, world } = solarSystem();
    expect(derived.escapeFlagForBody(world, bodies, 'sun')).toMatchObject({ escaped: false, specificEnergy: null });
    expect(derived.escapeFlagForBody(world, bodies, 'missing')).toBeNull();
    expect(derived.escapeFlags(world, bodies)).toHaveLength(6);
  });

  it('never reports escape from non-finite data', () => {
    const { bodies, world } = solarSystem();
    world.G = Number.NaN;
    expect(derived.escapeFlagForBody(world, bodies, 'earth')!.escaped).toBe(false);
    expect(derived.escapeFlagForBody(world, bodies, 'earth')!.specificEnergy).toBeNull();
    world.G = G;
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.pos[earthIndex * 3] = Number.POSITIVE_INFINITY;
    expect(derived.escapeFlagForBody(world, bodies, 'earth')!.escaped).toBe(false);
    expect(
      derived.escapeFlags(world, bodies).every(
        (flag) =>
          (flag.specificEnergy === null || Number.isFinite(flag.specificEnergy)) &&
          (flag.escapeSpeed === null || Number.isFinite(flag.escapeSpeed)) &&
          (flag.radialSpeed === null || Number.isFinite(flag.radialSpeed)),
      ),
    ).toBe(true);
  });
});

describe('derived orbital energy', () => {
  it('reports negative energy for a circular orbit', () => {
    const { bodies, world } = solarSystem();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.vel[earthIndex * 3 + 1] = Math.sqrt((G * 1e30) / 1e11);
    const energy = derived.orbitalEnergyForBody(world, bodies, 'earth')!;
    expect(energy.bound).toBe(true);
    expect(energy.specificEnergy).toBeLessThan(0);
    expect(energy.specificEnergy / (-(G * 1e30) / (2 * 1e11))).toBeCloseTo(1, 4);
    expect(energy.totalEnergy).toBeCloseTo(energy.kineticEnergy + energy.potentialEnergy, 0);
    expect(derived.isBoundToParent(world, bodies, 'earth')).toBe(true);
  });

  it('reports positive energy for an unbound body', () => {
    const { bodies, world } = solarSystem();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.vel[earthIndex * 3 + 1] = 5e4;
    const energy = derived.orbitalEnergyForBody(world, bodies, 'earth')!;
    expect(energy.bound).toBe(false);
    expect(energy.specificEnergy).toBeGreaterThan(0);
  });

  it('uses the configured softening length', () => {
    const { bodies, world } = solarSystem();
    const unsoftened = derived.orbitalEnergyForBody(world, bodies, 'earth')!;
    world.softening = 1e9;
    const softened = derived.orbitalEnergyForBody(world, bodies, 'earth')!;
    expect(softened.specificEnergy).toBeGreaterThan(unsoftened.specificEnergy);
    expect(softened.potentialEnergy).toBeGreaterThan(unsoftened.potentialEnergy);
  });

  it('returns null for invalid relationships and non-finite constants', () => {
    const { bodies, world } = solarSystem();
    expect(derived.orbitalEnergyForBody(world, bodies, 'sun')).toBeNull();
    expect(derived.orbitalEnergyForBody(world, bodies, 'missing')).toBeNull();
    world.G = Number.NEGATIVE_INFINITY;
    expect(derived.orbitalEnergyForBody(world, bodies, 'earth')).toBeNull();
  });

  it('aggregates all computable energies finite-safely', () => {
    const { bodies, world } = solarSystem();
    const energies = derived.orbitalEnergies(world, bodies);
    expect(energies.size).toBe(5);
    expect(Number.isFinite(derived.totalOrbitalEnergy(world, bodies))).toBe(true);
    expect([...energies.values()].every((entry) => Number.isFinite(entry.totalEnergy))).toBe(true);
  });
});

describe('derived collision candidates', () => {
  function overlappingWorld() {
    const bodies = [
      makeBody('a', { mass: 10, radius: 10, position: { x: 0, y: 0, z: 0 } }),
      makeBody('b', { mass: 10, radius: 10, position: { x: 15, y: 0, z: 0 } }),
      makeBody('c', { mass: 10, radius: 10, position: { x: 100, y: 0, z: 0 } }),
    ];
    return { bodies, world: makeWorld(bodies) };
  }

  it('detects overlapping pairs but ignores separated bodies', () => {
    const { world } = overlappingWorld();
    const pairs = derived.collisionCandidatePairs(world);
    expect(pairs).toHaveLength(1);
    expect([pairs[0].idA, pairs[0].idB]).toEqual(['a', 'b']);
    expect(pairs[0].penetration).toBeCloseTo(5, 9);
    expect(derived.hasCollisionCandidates(world)).toBe(true);
    expect(derived.deepestCollisionCandidate(world)?.idA).toBe('a');
  });

  it('orders candidates by penetration depth', () => {
    const { world } = overlappingWorld();
    world.pos[3] = 5; // body b is now deeply inside body a
    world.pos[6] = 18; // body c overlaps body a shallowly
    const pairs = derived.collisionCandidatePairs(world);
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < pairs.length; i += 1) expect(pairs[i - 1].penetration).toBeGreaterThanOrEqual(pairs[i].penetration);
  });

  it('ignores non-finite radii and positions', () => {
    const { world } = overlappingWorld();
    world.radius[1] = Number.NaN;
    expect(derived.collisionCandidatePairs(world)).toEqual([]);
    world.radius[1] = 10;
    world.pos[0] = Number.POSITIVE_INFINITY;
    expect(derived.collisionCandidatePairs(world)).toEqual([]);
  });

  it('optionally honours collision settings and mass filters', () => {
    const { world } = overlappingWorld();
    expect(derived.collisionCandidatePairs(world, { enabledOnly: true })).toEqual([]);
    world.collisionsEnabled = true;
    world.collisionMode = 'merge';
    expect(derived.collisionCandidatePairs(world, { enabledOnly: true })).toHaveLength(1);
    world.mass[0] = 0;
    expect(derived.collisionCandidatePairs(world)).toEqual([]);
    expect(derived.collisionCandidatePairs(world, { requireMass: false })).toHaveLength(1);
  });

  it('returns a finite relative speed even with unusable velocities', () => {
    const { world } = overlappingWorld();
    world.vel[1] = Number.NaN;
    const pairs = derived.collisionCandidatePairs(world);
    expect(pairs).toHaveLength(1);
    expect(Number.isFinite(pairs[0].relativeSpeed)).toBe(true);
    expect(pairs[0].relativeSpeed).toBe(0);
  });
});

describe('derived close-pair ranking', () => {
  it('sorts pairs by distance and applies limits', () => {
    const bodies = [
      makeBody('a', { position: { x: 0, y: 0, z: 0 } }),
      makeBody('b', { position: { x: 30, y: 0, z: 0 } }),
      makeBody('c', { position: { x: 5, y: 0, z: 0 } }),
      makeBody('d', { position: { x: 100, y: 0, z: 0 } }),
    ];
    const world = makeWorld(bodies);
    expect(derived.rankClosePairs(world).map((pair) => `${pair.idA}-${pair.idB}`)).toEqual([
      'a-c',
      'b-c',
      'a-b',
      'b-d',
      'c-d',
      'a-d',
    ]);
    expect(derived.rankClosePairs(world, { limit: 2 })).toHaveLength(2);
    expect(derived.rankClosePairs(world, { maxDistance: 10 })).toHaveLength(1);
    expect(derived.closestPair(world)?.distance).toBeCloseTo(5, 9);
  });

  it('skips non-finite positions and returns finite speeds', () => {
    const bodies = [
      makeBody('a', { position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 0, z: 0 } }),
      makeBody('b', { position: { x: 2, y: 0, z: 0 } }),
      makeBody('c', { position: { x: 0, y: Number.NaN, z: 0 } }),
    ];
    const world = makeWorld(bodies);
    const pairs = derived.rankClosePairs(world);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].distance).toBeCloseTo(2, 9);
    expect(pairs[0].relativeSpeed).toBeCloseTo(1, 9);
    expect(derived.closestPair(createPhysicsWorld(1))).toBeNull();
  });
});

describe('derived mass and radius ratio rankings', () => {
  it('sorts mass ratios with invalid ratios last', () => {
    const { bodies } = solarSystem();
    const ranked = derived.rankMassRatios(bodies);
    expect(ranked[0].id).toBe('moon');
    expect(ranked.at(-1)?.id).toBe('sun');
    expect(ranked.at(-1)?.valid).toBe(false);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(derived.topMassRatios(bodies, 1)[0].id).toBe('moon');
  });

  it('returns null ratios for missing parents and invalid masses', () => {
    const { bodies } = solarSystem();
    expect(derived.massRatioForBody(bodies, 'sun')).toBeNull();
    expect(derived.massRatioForBody(bodies, 'missing')).toBeNull();
    const broken = [makeBody('parent', { mass: 10 }), makeBody('child', { parentId: 'parent', mass: Number.NaN })];
    expect(derived.massRatioForBody(broken, 'child')).toBeNull();
  });

  it('prefers world masses when a world is supplied', () => {
    const { bodies, world } = solarSystem();
    const earthIndex = derived.findWorldBodyIndex(world, 'earth');
    world.mass[earthIndex] = 1e23;
    expect(derived.massRatioForBody(bodies, 'earth', world)).toBeCloseTo(1e23 / 1e30, 12);
    expect(derived.massRatioForBody(bodies, 'earth')).toBeCloseTo(6e24 / 1e30, 12);
    expect(derived.rankMassRatios(bodies, world)[0].id).toBe('moon');
  });

  it('sorts radius ratios and handles invalid parent radii', () => {
    const { bodies } = solarSystem();
    const ranked = derived.rankRadiusRatios(bodies);
    expect(ranked[0].id).toBe('moon');
    expect(ranked.at(-1)?.id).toBe('sun');
    expect(derived.radiusRatioForBody(bodies, 'sun')).toBeNull();
    expect(derived.radiusRatioForBody(bodies, 'moon')).toBeCloseTo(1.7e6 / 6e6, 9);
    const broken = [makeBody('parent', { radius: 0 }), makeBody('child', { parentId: 'parent' })];
    expect(derived.radiusRatioForBody(broken, 'child')).toBeNull();
    expect(derived.topRadiusRatios(bodies, 1)[0].id).toBe('moon');
  });
});

describe('derived body tags', () => {
  it('derives type, hashtag, state and parent tags', () => {
    const { bodies } = solarSystem();
    const earth = bodies.find((body) => body.id === 'earth')!;
    const tags = derived.bodyTags(earth);
    expect(tags).toContain('planet');
    expect(tags).toContain('type:planet');
    expect(tags).toContain('inner');
    expect(tags).toContain('rocky');
    expect(tags).toContain('visible');
    expect(tags).toContain('unlocked');
    expect(tags).toContain('parent:sun');
    expect(derived.bodyTags(null)).toEqual([]);
  });

  it('indexes tags by unique body id', () => {
    const { bodies } = solarSystem();
    const index = derived.bodyTagIndex(bodies);
    expect(index.get('planet')).toEqual(['venus', 'earth', 'mars']);
    expect(index.get('root')).toEqual(['sun']);
    expect(index.get('locked')).toEqual(['probe']);
  });

  it('filters bodies with all/any tag modes', () => {
    const { bodies } = solarSystem();
    expect(derived.filterBodiesByTags(bodies, ['#inner', 'planet']).map((body) => body.id)).toEqual([
      'venus',
      'earth',
    ]);
    expect(derived.filterBodiesByTags(bodies, ['star', 'moon'], 'any').map((body) => body.id)).toEqual([
      'sun',
      'moon',
    ]);
    expect(derived.filterBodiesByTags(bodies, [])).toHaveLength(6);
  });

  it('searches tags and free text case-insensitively', () => {
    const { bodies } = solarSystem();
    expect(derived.searchBodiesByTag(bodies, 'ROCKY').map((body) => body.id)).toEqual(['venus', 'earth']);
    expect(derived.searchBodiesByTag(bodies, 'venus').map((body) => body.id)).toEqual(['venus']);
    expect(derived.searchBodiesByTag(bodies, '  ')).toEqual([]);
    const malformed = [makeBody('odd', { notes: null as unknown as string })];
    expect(() => derived.bodyTags(malformed[0])).not.toThrow();
  });
});

describe('derived selection neighbourhood and visibility', () => {
  it('assembles parent, children, siblings and nearest neighbours', () => {
    const { bodies, world } = solarSystem();
    const neighbourhood = derived.selectionNeighbourhood(world, bodies, 'earth');
    expect(neighbourhood.selectedId).toBe('earth');
    expect(neighbourhood.parentId).toBe('sun');
    expect(neighbourhood.childIds).toEqual(['moon']);
    expect(neighbourhood.siblingIds).toEqual(['venus', 'mars']);
    expect(neighbourhood.neighbours[0].id).toBe('moon');
    expect(neighbourhood.neighbours.every((entry) => Number.isFinite(entry.distance))).toBe(true);
    expect(derived.nearestNeighbourIds(world, bodies, 'earth', { nearest: 1 })).toEqual(['moon']);
  });

  it('returns an empty neighbourhood for missing selections', () => {
    const { bodies, world } = solarSystem();
    expect(derived.selectionNeighbourhood(world, bodies, 'missing')).toEqual({
      selectedId: null,
      parentId: null,
      childIds: [],
      siblingIds: [],
      neighbours: [],
    });
  });

  it('applies neighbour limits and distance cutoffs', () => {
    const { bodies, world } = solarSystem();
    expect(derived.selectionNeighbourhood(world, bodies, 'earth', { nearest: 0 }).neighbours).toEqual([]);
    const nearby = derived.selectionNeighbourhood(world, bodies, 'earth', { maxDistance: 1e9 });
    expect(nearby.neighbours.map((entry) => entry.id)).toEqual(['moon', 'probe']);
    expect(derived.selectionNeighbourhood(world, bodies, 'earth', { maxDistance: Number.NaN }).neighbours).toHaveLength(3);
  });

  it('filters visible bodies and world slots', () => {
    const { bodies, world } = solarSystem();
    bodies.find((body) => body.id === 'venus')!.visible = false;
    expect(derived.visibleBodies(bodies).map((body) => body.id)).not.toContain('venus');
    expect(derived.visibleBodyIds(bodies)).toHaveLength(5);
    bodies.find((body) => body.id === 'earth')!.physical.mass = Number.NaN;
    expect(derived.visibleBodies(bodies, { requireFinitePhysical: true }).map((body) => body.id)).not.toContain('earth');
    expect(derived.visibleWorldIndices(world, bodies)).toHaveLength(5);
    expect(derived.isVisibleInWorld(world, bodies, 'earth')).toBe(true);
    expect(derived.isVisibleInWorld(world, bodies, 'venus')).toBe(false);
  });

  it('exports the full derived-state barrel', () => {
    const exports = [
      'buildBodyIndex',
      'parentChain',
      'descendantsOf',
      'buildHierarchyTree',
      'siblingGroups',
      'subtreeBarycentre',
      'subtreeMass',
      'hillRadius',
      'mutualHillSpacing',
      'relativeVelocityToParent',
      'rankRelativeSpeeds',
      'escapeFlags',
      'orbitalEnergyForBody',
      'collisionCandidatePairs',
      'rankClosePairs',
      'rankMassRatios',
      'rankRadiusRatios',
      'searchBodiesByTag',
      'selectionNeighbourhood',
      'visibleBodies',
    ] as const;
    for (const name of exports) expect(typeof derived[name]).toBe('function');
  });
});
