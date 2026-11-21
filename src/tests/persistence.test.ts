import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../state/defaults';
import {
  deleteUniverse,
  duplicateUniverse,
  listUniverses,
  loadUniverse,
  renameUniverse,
  saveUniverse,
} from '../storage/universes';
import { loadSettings, saveSettings } from '../storage/settings';
import { exportUniverseJson, importUniverseJson, safeFilename } from '../storage/importExport';
import { validateUniverseShape, wrap } from '../storage/schema';
import { getScenario } from '../scenarios/registry';

describe('local persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('saves, lists, loads, renames and deletes universes', () => {
    const universe = structuredClone(getScenario('circular-orbit')!.universe);
    expect(saveUniverse(universe)).toBe(true);
    expect(listUniverses()).toHaveLength(1);
    expect(loadUniverse(universe.id)?.name).toBe(universe.name);
    expect(renameUniverse(universe.id, 'Renamed')?.name).toBe('Renamed');
    const copy = duplicateUniverse(universe.id);
    expect(copy?.name).toContain('copy');
    expect(listUniverses()).toHaveLength(2);
    deleteUniverse(universe.id);
    expect(loadUniverse(universe.id)).toBeNull();
  });

  it('persists and normalises settings', () => {
    expect(saveSettings({ ...DEFAULT_SETTINGS, theme: 'midnight' })).toBe(true);
    const loaded = loadSettings();
    expect(loaded.theme).toBe('midnight');
    expect(loaded.performance.quality).toBe('balanced');
  });

  it('returns defaults when stored data is corrupt', () => {
    window.localStorage.setItem('orbital:settings', '{broken');
    expect(loadSettings().theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('exports and imports a valid universe', () => {
    const universe = structuredClone(getScenario('earth-moon')!.universe);
    const json = exportUniverseJson(universe);
    const result = importUniverseJson(json);
    expect(result.ok).toBe(true);
    expect(result.universe?.bodies).toHaveLength(2);
  });

  it('rejects invalid imports gracefully', () => {
    expect(importUniverseJson('not json').error).toBeTruthy();
    expect(importUniverseJson(JSON.stringify({ version: 99, kind: 'universe' })).ok).toBe(false);
    expect(importUniverseJson(JSON.stringify(wrap('settings', {}))).ok).toBe(false);
  });

  it('validates universe shapes and produces safe filenames', () => {
    expect(validateUniverseShape(getScenario('circular-orbit')!.universe)).toBe(true);
    expect(validateUniverseShape({ id: 'x', name: 'x' })).toBe(false);
    expect(safeFilename('My Universe! 2026')).toBe('my-universe-2026');
  });
});
