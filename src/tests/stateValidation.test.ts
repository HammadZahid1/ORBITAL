import { describe, expect, it } from 'vitest';
import { getScenario } from '../scenarios/registry';
import { DEFAULT_SETTINGS } from '../state/defaults';
import { exportUniverseJson, importUniverseJson } from '../storage/importExport';
import {
  SCHEMA_VERSION,
  normaliseSettings,
  unwrap,
  validateBodyShape,
  validateSettingsShape,
  validateUniverseShape,
  wrap,
} from '../storage/schema';
import type { Universe } from '../types/celestial';

const template = (): Universe => structuredClone(getScenario('solar-system')!.universe);

describe('state and schema validation', () => {
  it('rejects non-finite or non-positive physical values in body definitions', () => {
    const valid = template().bodies[0];
    expect(validateBodyShape(valid)).toBe(true);

    const negativeMass = structuredClone(valid);
    negativeMass.physical.mass = -1;
    expect(validateBodyShape(negativeMass)).toBe(false);

    const infiniteRadius = structuredClone(valid);
    infiniteRadius.physical.radius = Number.POSITIVE_INFINITY;
    expect(validateBodyShape(infiniteRadius)).toBe(false);

    const nonFinitePosition = structuredClone(valid);
    nonFinitePosition.physical.position.z = Number.NaN;
    expect(validateBodyShape(nonFinitePosition)).toBe(false);

    const badScale = structuredClone(valid);
    badScale.visual.visualScale = 0;
    expect(validateBodyShape(badScale)).toBe(false);

    const badTrail = structuredClone(valid);
    badTrail.visual.trail.length = Number.NaN;
    expect(validateBodyShape(badTrail)).toBe(false);

    expect(validateBodyShape({ ...valid, visual: undefined })).toBe(false);
  });

  it('rejects duplicate ids and malformed solver settings in a universe', () => {
    const valid = template();
    expect(validateUniverseShape(valid)).toBe(true);

    const duplicateIds = template();
    duplicateIds.bodies[1].id = duplicateIds.bodies[0].id;
    expect(validateUniverseShape(duplicateIds)).toBe(false);

    const badIntegrator = template();
    expect(
      validateUniverseShape({
        ...badIntegrator,
        settings: { ...badIntegrator.settings, integrator: 'unstable' },
      }),
    ).toBe(false);

    const nonFiniteSoftening = template();
    nonFiniteSoftening.settings.softening = Number.NaN;
    expect(validateUniverseShape(nonFiniteSoftening)).toBe(false);

    expect(validateUniverseShape({ ...template(), bodies: {} })).toBe(false);
  });

  it('enforces envelope version, kind and validator in unwrap', () => {
    const universe = template();
    const envelope = wrap('universe', universe);
    expect(envelope.version).toBe(SCHEMA_VERSION);
    expect(unwrap(JSON.stringify(envelope), 'universe', validateUniverseShape)).toEqual(
      JSON.parse(JSON.stringify(universe)),
    );

    expect(
      unwrap(JSON.stringify({ ...envelope, version: SCHEMA_VERSION + 1 }), 'universe', validateUniverseShape),
    ).toBeNull();
    expect(unwrap(JSON.stringify({ ...envelope, kind: 'settings' }), 'universe', validateUniverseShape)).toBeNull();
    expect(unwrap('{not json', 'universe', validateUniverseShape)).toBeNull();
    expect(unwrap(JSON.stringify({ ...envelope, data: null }), 'universe', validateUniverseShape)).toBeNull();
  });

  it('fills missing settings from defaults without discarding valid overrides', () => {
    const partial = {
      theme: 'midnight',
      reduceMotion: true,
      timestep: 60,
      timeScale: 600,
      performance: { quality: 'high', targetFps: 30 },
    };
    expect(validateSettingsShape(partial)).toBe(true);
    const normalised = normaliseSettings(partial);
    expect(normalised.theme).toBe('midnight');
    expect(normalised.reduceMotion).toBe(true);
    expect(normalised.performance.quality).toBe('high');
    expect(normalised.performance.targetFps).toBe(30);
    expect(normalised.performance.maxAsteroids).toBe(DEFAULT_SETTINGS.performance.maxAsteroids);
    expect(normalised.integrator).toBe(DEFAULT_SETTINGS.integrator);
    expect(normalised.units).toBe(DEFAULT_SETTINGS.units);

    expect(validateSettingsShape({ ...partial, timestep: Number.NaN })).toBe(false);
    expect(normaliseSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips every nested field through the exported universe format', () => {
    const universe = template();
    const result = importUniverseJson(exportUniverseJson(universe));
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.universe).toEqual(JSON.parse(JSON.stringify(universe)));
    expect(result.universe!.bodies[0].visual.trail).toEqual(universe.bodies[0].visual.trail);
    expect(result.universe!.settings).toEqual(universe.settings);
  });
});
