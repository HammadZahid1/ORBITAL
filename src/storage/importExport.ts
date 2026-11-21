import type { Universe } from '../types/celestial';
import { validateUniverseShape, wrap } from './schema';

export interface ImportResult {
  ok: boolean;
  universe?: Universe;
  error?: string;
}

export function exportUniverseJson(universe: Universe): string {
  return JSON.stringify(wrap('universe', universe), null, 2);
}

export function importUniverseJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'The file does not contain an object.' };
  const candidate = parsed as { version?: unknown; kind?: unknown; data?: unknown };
  if (candidate.version !== 1) return { ok: false, error: 'Unsupported configuration version.' };
  if (candidate.kind !== 'universe') return { ok: false, error: 'This file is not an ORBITAL universe.' };
  if (!validateUniverseShape(candidate.data)) return { ok: false, error: 'Universe validation failed.' };
  return { ok: true, universe: candidate.data };
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'universe';
}
