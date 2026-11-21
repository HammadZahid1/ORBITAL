/** Derived body tags plus tag-based search and filtering. */

import type { CelestialBody } from '../../types/celestial';
import { normaliseText } from './internal';

const HASHTAG = /#[A-Za-z0-9_-]+/g;

/** Strips an optional leading hashtag and normalises a tag/query for comparison. */
export function normaliseTag(value: unknown): string {
  const text = normaliseText(value);
  return text.startsWith('#') ? text.slice(1) : text;
}

/**
 * Tags derived from a body definition: its type (plain and `type:` prefixed),
 * `#hashtags` in notes, visibility/lock state and its parent (or `root`).
 */
export function bodyTags(body: CelestialBody | null | undefined): string[] {
  if (!body) return [];
  const tags = new Set<string>();
  const type = normaliseTag(body.type);
  if (type) {
    tags.add(type);
    tags.add(`type:${type}`);
  }
  if (typeof body.notes === 'string') {
    for (const match of body.notes.match(HASHTAG) ?? []) {
      const tag = normaliseTag(match);
      if (tag) tags.add(tag);
    }
  }
  tags.add(body.visible === true ? 'visible' : 'hidden');
  tags.add(body.locked === true ? 'locked' : 'unlocked');
  const parent = normaliseTag(body.parentId);
  tags.add(parent ? `parent:${parent}` : 'root');
  return [...tags];
}

/** Maps each tag to the unique IDs of bodies carrying it. */
export function bodyTagIndex(bodies: readonly CelestialBody[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const body of bodies) {
    if (!body || seen.has(body.id)) continue;
    seen.add(body.id);
    for (const tag of bodyTags(body)) {
      const ids = index.get(tag);
      if (ids) ids.push(body.id);
      else index.set(tag, [body.id]);
    }
  }
  return index;
}

/** Filters bodies by tags; `all` (default) requires every tag, `any` requires one. */
export function filterBodiesByTags(
  bodies: readonly CelestialBody[],
  tags: readonly string[],
  mode: 'all' | 'any' = 'all',
): CelestialBody[] {
  const wanted = tags.map(normaliseTag).filter(Boolean);
  if (wanted.length === 0) return bodies.filter((body) => Boolean(body));
  const matches = (body: CelestialBody) => {
    const available = bodyTags(body);
    return mode === 'any'
      ? wanted.some((tag) => available.includes(tag))
      : wanted.every((tag) => available.includes(tag));
  };
  return bodies.filter((body) => Boolean(body) && matches(body));
}

/** Case-insensitive search over tags, IDs, names, types and notes. */
export function searchBodiesByTag(bodies: readonly CelestialBody[], query: string): CelestialBody[] {
  const needle = normaliseTag(query);
  if (!needle) return [];
  return bodies.filter((body) => {
    if (!body) return false;
    if (bodyTags(body).includes(needle)) return true;
    return [body.id, body.name, body.type, body.notes].some((field) => normaliseText(field).includes(needle));
  });
}
