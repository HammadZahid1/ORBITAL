import type { Universe } from '../types/celestial';
import { nextId } from '../data/bodyFactory';
import { safeGet, safeKeys, safeRemove, safeSet } from './localStorage';
import { unwrap, wrap } from './schema';

const INDEX_KEY = 'universes:index';
const keyFor = (id: string) => `universes:${id}`;

function readIndex(): string[] {
  const raw = safeGet(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  safeSet(INDEX_KEY, JSON.stringify([...new Set(ids)]));
}

export function saveUniverse(universe: Universe): boolean {
  const stored = wrap('universe', structuredClone(universe));
  if (!safeSet(keyFor(universe.id), JSON.stringify(stored))) return false;
  const index = readIndex();
  if (!index.includes(universe.id)) writeIndex([...index, universe.id]);
  return true;
}

export function loadUniverse(id: string): Universe | null {
  const raw = safeGet(keyFor(id));
  if (!raw) return null;
  return unwrap(raw, 'universe', (value): value is Universe => {
    const candidate = value as Universe;
    return Boolean(candidate && typeof candidate.id === 'string' && Array.isArray(candidate.bodies));
  });
}

export function listUniverses(): Universe[] {
  return readIndex()
    .map(loadUniverse)
    .filter((universe): universe is Universe => universe !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteUniverse(id: string): boolean {
  safeRemove(keyFor(id));
  writeIndex(readIndex().filter((existing) => existing !== id));
  return true;
}

export function renameUniverse(id: string, name: string): Universe | null {
  const universe = loadUniverse(id);
  if (!universe) return null;
  universe.name = name;
  universe.updatedAt = Date.now();
  saveUniverse(universe);
  return universe;
}

export function duplicateUniverse(id: string): Universe | null {
  const universe = loadUniverse(id);
  if (!universe) return null;
  const copy: Universe = {
    ...structuredClone(universe),
    id: nextId('universe'),
    name: `${universe.name} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveUniverse(copy);
  return copy;
}

export function savedUniverseCount(): number {
  return safeKeys().filter((key) => key.startsWith('universes:') && key !== INDEX_KEY).length;
}
