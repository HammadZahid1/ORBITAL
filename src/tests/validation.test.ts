import { describe, expect, it } from 'vitest';
import { C, G } from '../engine/numeric';
import { createExtraScenarios } from '../scenarios/extra';
import { SCENARIOS, getScenario } from '../scenarios/registry';
import type { Scenario } from '../scenarios/types';
import { exportUniverseJson } from '../storage/importExport';
import { wrap } from '../storage/schema';
import type { CelestialBody, Universe } from '../types/celestial';
import * as v from '../validation';
import type { RepairAction, ValidationReport } from '../validation';

const template = (): Universe => structuredClone(getScenario('circular-orbit')!.universe);
const codes = (report: ValidationReport): string[] => report.issues.map((issue) => issue.code);
const has = (report: ValidationReport, code: string): boolean => codes(report).includes(code);
const withOnly = (body: CelestialBody): Universe => {
  const universe = template();
  universe.bodies = [structuredClone(body)];
  return universe;
};

describe('validation module surface', () => {
  it('exports the full validating and sanity-checking API from the barrel', () => {
    const functions = [
      'validateUniverse',
      'validateUniverseInput',
      'checkSchemaVersion',
      'isSupportedSchemaVersion',
      'checkRequiredFields',
      'checkFiniteState',
      'checkPhysicalBounds',
      'checkDuplicateIds',
      'checkHierarchy',
      'checkOrbitalParameters',
      'checkEnergySanity',
      'checkMomentumSanity',
      'checkCollisionOverlap',
      'checkScaleReasonableness',
      'checkIntegratorCompatibility',
      'checkUniverseSettings',
      'validateScenarioMetadata',
      'inspectImportText',
      'inspectImportValue',
      'createReport',
      'mergeReports',
      'collectRepairs',
      'applyRepairs',
      'repairUniverse',
      'worstSeverity',
    ] as const;
    for (const name of functions) expect(typeof v[name], name).toBe('function');
    expect(Object.keys(v.ISSUE_CODES).length).toBeGreaterThan(30);
  });

  it('ranks severities and finds the worst level', () => {
    expect(v.SEVERITY_RANK.error).toBeGreaterThan(v.SEVERITY_RANK.warning);
    expect(v.SEVERITY_RANK.warning).toBeGreaterThan(v.SEVERITY_RANK.info);
    expect(v.isMoreSevere('error', 'warning')).toBe(true);
    expect(v.isMoreSevere('info', 'warning')).toBe(false);
    expect(v.worstSeverity(['info', 'warning', 'error', 'info'])).toBe('error');
    expect(v.worstSeverity([])).toBeNull();
    expect(v.countSeverities(['info', 'info', 'warning'])).toEqual({ error: 0, warning: 1, info: 2 });
  });

  it('aggregates, counts and orders issues in a report', () => {
    const issues = [
      v.makeIssue(v.ISSUE_CODES.NON_FINITE_NUMBER, 'info', 'a', 'bodies[1].a'),
      v.makeIssue(v.ISSUE_CODES.FIELD_MISSING, 'error', 'b', 'bodies[0].b'),
      v.makeIssue(v.ISSUE_CODES.OVERLAP, 'warning', 'c', 'bodies[2].c'),
      v.makeIssue(v.ISSUE_CODES.FIELD_MISSING, 'error', 'd', 'bodies[0].d'),
    ];
    const report = v.createReport(issues);
    expect(report.valid).toBe(false);
    expect(report.level).toBe('error');
    expect(report.counts).toEqual({ error: 2, warning: 1, info: 1 });
    expect(report.errors).toHaveLength(2);
    expect(report.warnings).toHaveLength(1);
    expect(report.byCode[v.ISSUE_CODES.FIELD_MISSING]).toBe(2);
    expect(report.issues.map((issue) => issue.severity)).toEqual(['error', 'error', 'warning', 'info']);
    expect(v.isBlocking(report)).toBe(true);
  });

  it('merges reports without losing issues', () => {
    const first = v.createReport([v.makeIssue(v.ISSUE_CODES.OVERLAP, 'warning', 'a', 'bodies')]);
    const second = v.createReport([v.makeIssue(v.ISSUE_CODES.FIELD_MISSING, 'error', 'b', 'id')]);
    const merged = v.mergeReports(first, second);
    expect(merged.issues).toHaveLength(2);
    expect(merged.level).toBe('error');
    expect(merged.counts).toEqual({ error: 1, warning: 1, info: 0 });
  });

  it('treats an empty report as valid and non-blocking', () => {
    const report = v.createReport([]);
    expect(report.valid).toBe(true);
    expect(report.level).toBe('ok');
    expect(report.issues).toEqual([]);
    expect(v.isBlocking(report)).toBe(false);
  });
});

describe('valid universes and scenarios', () => {
  it('accepts the orbital reference universe without errors', () => {
    const report = v.validateUniverse(template());
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('treats an empty universe as valid with an informational note', () => {
    const universe = template();
    universe.bodies = [];
    const report = v.validateUniverse(universe);
    expect(report.valid).toBe(true);
    expect(has(report, v.ISSUE_CODES.UNIVERSE_EMPTY)).toBe(true);
  });

  for (const scenario of [...SCENARIOS, ...createExtraScenarios()]) {
    it(`accepts built-in scenario ${scenario.id} without errors`, () => {
      const report = v.validateUniverse(scenario.universe);
      expect(report.valid, report.errors.map((issue) => `${issue.path}: ${issue.message}`).join('\n')).toBe(true);
    });
  }

  it('accepts metadata for every bundled scenario', () => {
    for (const scenario of [...SCENARIOS, ...createExtraScenarios()]) {
      const report = v.validateScenarioMetadata(scenario);
      expect(report.valid, `${scenario.id}: ${report.errors.map((issue) => issue.message).join('; ')}`).toBe(true);
    }
  });
});

describe('schema version and import safety', () => {
  it('accepts the supported schema version and rejects missing or future versions', () => {
    expect(v.checkSchemaVersion(wrap('universe', template()))).toEqual([]);
    expect(has(v.createReport(v.checkSchemaVersion({})), v.ISSUE_CODES.SCHEMA_VERSION_MISSING)).toBe(true);
    expect(v.isSupportedSchemaVersion(1)).toBe(true);
    expect(v.isSupportedSchemaVersion(2)).toBe(false);
    expect(v.isSupportedSchemaVersion('1')).toBe(false);
    expect(v.isSupportedSchemaVersion(1.5)).toBe(false);
  });

  it('reports unsupported versions with details', () => {
    const issues = v.checkSchemaVersion({ version: 99 }, 1);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe(v.ISSUE_CODES.SCHEMA_VERSION_UNSUPPORTED);
    expect(issues[0].details?.expected).toBe(1);
  });

  it('imports a valid exported universe safely', () => {
    const universe = template();
    const result = v.inspectImportText(exportUniverseJson(universe));
    expect(result.report.valid).toBe(true);
    expect(result.universe?.id).toBe(universe.id);
    expect(result.universe?.bodies).toHaveLength(universe.bodies.length);
  });

  it('rejects malformed JSON, missing data and non-object roots', () => {
    expect(has(v.inspectImportText('{not json').report, v.ISSUE_CODES.IMPORT_MALFORMED_JSON)).toBe(true);
    expect(has(v.inspectImportText(JSON.stringify({ version: 1, kind: 'universe' })).report, v.ISSUE_CODES.IMPORT_MISSING_DATA)).toBe(true);
    expect(has(v.inspectImportValue(42).report, v.ISSUE_CODES.IMPORT_NOT_OBJECT)).toBe(true);
  });

  it('rejects wrong version and wrong envelope kind', () => {
    const envelope = wrap('universe', template());
    expect(has(v.inspectImportValue({ ...envelope, version: 2 }).report, v.ISSUE_CODES.SCHEMA_VERSION_UNSUPPORTED)).toBe(true);
    expect(has(v.inspectImportValue({ ...envelope, kind: 'settings' }).report, v.ISSUE_CODES.UNIVERSE_KIND_MISMATCH)).toBe(true);
  });

  it('flags prototype-pollution keys in imported data', () => {
    const envelope = JSON.stringify(wrap('universe', template())).replace(
      '"data":{',
      '"data":{"__proto__":{"polluted":true},',
    );
    const result = v.inspectImportText(envelope);
    expect(has(result.report, v.ISSUE_CODES.IMPORT_UNSAFE_KEY)).toBe(true);
    expect(result.universe).toBeNull();
  });

  it('enforces text size, body count and nesting limits', () => {
    const universe = template();
    expect(has(v.inspectImportText(exportUniverseJson(universe), { maxImportBytes: 10 }).report, v.ISSUE_CODES.IMPORT_TOO_LARGE)).toBe(true);
    const extraBody = structuredClone(universe.bodies[1]);
    extraBody.id = 'extra';
    universe.bodies.push(extraBody);
    expect(has(v.inspectImportValue(wrap('universe', universe), { maxBodies: 2 }).report, v.ISSUE_CODES.IMPORT_TOO_MANY_BODIES)).toBe(true);
    const deep: { child?: unknown } = {};
    let cursor = deep;
    for (let i = 0; i < 80; i += 1) {
      cursor.child = {};
      cursor = cursor.child as { child?: unknown };
    }
    expect(has(v.inspectImportValue({ ...wrap('universe', template()), extra: deep }, { maxImportDepth: 10 }).report, v.ISSUE_CODES.IMPORT_TOO_DEEP)).toBe(true);
  });

  it('rejects imported data that does not match the storage shape', () => {
    expect(has(v.inspectImportValue(wrap('universe', { id: 'x', name: 'x' })).report, v.ISSUE_CODES.IMPORT_SHAPE_INVALID)).toBe(true);
    expect(v.inspectImportValue(wrap('universe', template())).universe).not.toBeNull();
  });
});

describe('required fields and finite numeric state', () => {
  it('reports missing and empty universe fields', () => {
    const report = v.validateUniverse({ ...template(), name: '' });
    expect(has(report, v.ISSUE_CODES.FIELD_EMPTY)).toBe(true);
    const missing = v.validateUniverse({ id: 'x', bodies: [], settings: {} });
    expect(has(missing, v.ISSUE_CODES.FIELD_MISSING)).toBe(true);
    expect(has(v.createReport(v.checkRequiredFields(null)), v.ISSUE_CODES.FIELD_INVALID_TYPE)).toBe(true);
  });

  it('reports malformed body, settings and tag container types', () => {
    const base = template();
    expect(has(v.validateUniverse({ ...base, bodies: {} }), v.ISSUE_CODES.FIELD_INVALID_TYPE)).toBe(true);
    expect(has(v.validateUniverse({ ...base, settings: [] }), v.ISSUE_CODES.FIELD_INVALID_TYPE)).toBe(true);
    expect(has(v.validateUniverse({ ...base, tags: [1, 2] }), v.ISSUE_CODES.FIELD_INVALID_TYPE)).toBe(true);
    const body = structuredClone(base.bodies[0]);
    delete (body as Partial<CelestialBody>).physical;
    expect(has(v.validateUniverse({ ...base, bodies: [body] }), v.ISSUE_CODES.FIELD_MISSING)).toBe(true);
  });

  it('detects NaN mass and offers a repair that removes the error', () => {
    const universe = template();
    universe.bodies[1].physical.mass = Number.NaN;
    const report = v.validateUniverse(universe);
    const issue = report.errors.find((entry) => entry.path === 'bodies[1].physical.mass');
    expect(issue).toBeDefined();
    expect(issue?.code).toBe(v.ISSUE_CODES.NON_FINITE_NUMBER);
    const repaired = v.repairUniverse(universe, report);
    expect(repaired.bodies[1].physical.mass).toBe(1);
    expect(has(v.validateUniverse(repaired), v.ISSUE_CODES.NON_FINITE_NUMBER)).toBe(false);
  });

  it('detects infinities in every vector component', () => {
    const universe = template();
    for (const [index, vector] of [
      [0, 'position'],
      [1, 'velocity'],
      [0, 'acceleration'],
    ] as const) {
      const current = universe.bodies[index];
      current.physical[vector].z = Number.POSITIVE_INFINITY;
    }
    const report = v.validateUniverse(universe);
    const paths = codes(report);
    expect(paths).toContain('state.non-finite');
    expect(report.errors.filter((issue) => issue.code === v.ISSUE_CODES.NON_FINITE_NUMBER)).toHaveLength(3);
    expect(report.errors.some((issue) => issue.path.endsWith('.position.z'))).toBe(true);
    expect(report.errors.some((issue) => issue.path.endsWith('.velocity.z'))).toBe(true);
    expect(report.errors.some((issue) => issue.path.endsWith('.acceleration.z'))).toBe(true);
  });

  it('detects non-finite scalar state, visual values, settings and timestamps', () => {
    const universe = template();
    universe.bodies[1].physical.rotation = Number.NaN;
    universe.bodies[1].physical.rotationSpeed = Number.NEGATIVE_INFINITY;
    universe.bodies[1].visual.visualScale = Number.NaN;
    universe.bodies[1].visual.trail.length = Number.POSITIVE_INFINITY;
    universe.settings.G = Number.NaN;
    universe.createdAt = Number.NaN;
    const report = v.checkFiniteState(universe);
    expect(report).toHaveLength(6);
    expect(report.every((issue) => issue.severity === 'error')).toBe(true);
    expect(report.every((issue) => issue.repair !== undefined)).toBe(true);
  });

  it('finds no finite-state issues in a valid universe', () => {
    expect(v.checkFiniteState(template())).toEqual([]);
  });
});

describe('mass, radius and scale bounds', () => {
  it('rejects zero and negative masses and radii', () => {
    const universe = template();
    universe.bodies[1].physical.mass = 0;
    universe.bodies[1].physical.radius = -5;
    const report = v.checkPhysicalBounds(universe);
    expect(has(v.createReport(report), v.ISSUE_CODES.MASS_OUT_OF_RANGE)).toBe(true);
    expect(has(v.createReport(report), v.ISSUE_CODES.RADIUS_OUT_OF_RANGE)).toBe(true);
    expect(report.filter((issue) => issue.severity === 'error')).toHaveLength(2);
  });

  it('warns about extreme and implausibly small masses and radii', () => {
    const universe = template();
    universe.bodies[1].physical.mass = 1e45;
    universe.bodies[1].physical.radius = 1e20;
    const report = v.createReport(v.checkPhysicalBounds(universe));
    expect(report.errors).toEqual([]);
    expect(report.warnings.length).toBeGreaterThanOrEqual(2);
    const tiny = template();
    tiny.bodies[1].physical.mass = 1e-9;
    tiny.bodies[1].physical.radius = 1e-9;
    expect(v.checkPhysicalBounds(tiny).filter((issue) => issue.severity === 'warning')).toHaveLength(2);
  });

  it('warns about super-nuclear mean density', () => {
    const universe = template();
    universe.bodies[1].physical.mass = 1e30;
    universe.bodies[1].physical.radius = 10;
    expect(has(v.createReport(v.checkPhysicalBounds(universe)), v.ISSUE_CODES.DENSITY_EXTREME)).toBe(true);
  });

  it('warns about extreme coordinate extents and rejects impossible extents', () => {
    const universe = template();
    universe.bodies[1].physical.position.x = 1e25;
    const warning = v.checkScaleReasonableness(universe);
    expect(warning.some((issue) => issue.code === v.ISSUE_CODES.SCALE_EXTREME && issue.severity === 'warning')).toBe(true);
    universe.bodies[1].physical.position.x = 1e31;
    expect(has(v.createReport(v.checkScaleReasonableness(universe)), v.ISSUE_CODES.SCALE_EXTREME)).toBe(true);
  });

  it('rejects non-positive visual scales and warns about huge ones', () => {
    const universe = template();
    universe.bodies[1].visual.visualScale = 0;
    const invalid = v.checkScaleReasonableness(universe);
    expect(invalid[0].severity).toBe('error');
    expect(invalid[0].repair?.kind).toBe('set-number');
    universe.bodies[1].visual.visualScale = 1000;
    expect(v.checkScaleReasonableness(universe)[0].severity).toBe('warning');
  });

  it('reports no scale issues for a valid universe', () => {
    expect(v.checkScaleReasonableness(template())).toEqual([]);
  });
});

describe('duplicate identifiers', () => {
  it('reports duplicate ids with the first location and a rename repair', () => {
    const universe = template();
    const originalId = universe.bodies[1].id;
    universe.bodies[1].id = universe.bodies[0].id;
    const issues = v.checkDuplicateIds(universe);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe(v.ISSUE_CODES.DUPLICATE_ID);
    expect(issues[0].details?.firstIndex).toBe(0);
    expect(issues[0].repair?.kind).toBe('set-string');
    expect(originalId).not.toBe(universe.bodies[0].id);
  });

  it('warns about duplicate body names', () => {
    const universe = template();
    universe.bodies[1].name = universe.bodies[0].name;
    expect(has(v.createReport(v.checkDuplicateIds(universe)), v.ISSUE_CODES.DUPLICATE_NAME)).toBe(true);
  });

  it('accepts unique ids and names', () => {
    expect(v.checkDuplicateIds(template())).toEqual([]);
  });
});

describe('parent existence and acyclicity', () => {
  it('reports a missing parent and can detach it automatically', () => {
    const universe = template();
    universe.bodies[1].parentId = 'ghost';
    const report = v.validateUniverse(universe);
    const issue = report.errors.find((entry) => entry.code === v.ISSUE_CODES.PARENT_MISSING);
    expect(issue).toBeDefined();
    expect(issue?.repair?.kind).toBe('set-null');
    const repaired = v.repairUniverse(universe, report);
    expect(repaired.bodies[1].parentId).toBeNull();
    expect(has(v.validateUniverse(repaired), v.ISSUE_CODES.PARENT_MISSING)).toBe(false);
  });

  it('rejects a body that is its own parent', () => {
    const universe = template();
    universe.bodies[1].parentId = universe.bodies[1].id;
    expect(has(v.validateUniverse(universe), v.ISSUE_CODES.PARENT_SELF)).toBe(true);
  });

  it('detects a two-body parent cycle', () => {
    const universe = template();
    universe.bodies[0].parentId = universe.bodies[1].id;
    universe.bodies[1].parentId = universe.bodies[0].id;
    const report = v.validateUniverse(universe);
    expect(has(report, v.ISSUE_CODES.HIERARCHY_CYCLE)).toBe(true);
    expect(report.errors.find((issue) => issue.code === v.ISSUE_CODES.HIERARCHY_CYCLE)?.repair?.kind).toBe('set-null');
  });

  it('detects a longer parent cycle once', () => {
    const universe = template();
    const third = structuredClone(universe.bodies[1]);
    third.id = 'third';
    third.parentId = universe.bodies[0].id;
    universe.bodies.push(third);
    universe.bodies[0].parentId = 'third';
    const report = v.validateUniverse(universe);
    expect(report.issues.filter((issue) => issue.code === v.ISSUE_CODES.HIERARCHY_CYCLE)).toHaveLength(1);
  });

  it('accepts a valid multi-level parent chain', () => {
    const universe = template();
    const third = structuredClone(universe.bodies[1]);
    third.id = 'third';
    third.parentId = universe.bodies[1].id;
    universe.bodies.push(third);
    universe.bodies[1].parentId = universe.bodies[0].id;
    expect(v.checkHierarchy(universe)).toEqual([]);
  });

  it('warns about excessively deep parent chains', () => {
    const universe = template();
    universe.bodies = [];
    for (let i = 0; i < 35; i += 1) {
      const body = structuredClone(getScenario('circular-orbit')!.universe.bodies[1]);
      body.id = `body-${i}`;
      body.parentId = i === 0 ? null : `body-${i - 1}`;
      body.physical.position = { x: i * 1e9, y: 0, z: 0 };
      body.physical.velocity = { x: 0, y: 0, z: 0 };
      universe.bodies.push(body);
    }
    expect(has(v.createReport(v.checkHierarchy(universe)), v.ISSUE_CODES.HIERARCHY_DEEP)).toBe(true);
  });
});

describe('orbital, energy and momentum sanity', () => {
  it('warns when a bound orbit intersects the parent surface', () => {
    const universe = template();
    const parent = universe.bodies[0];
    const orbiter = universe.bodies[1];
    const radius = parent.physical.radius + orbiter.physical.radius * 0.1;
    orbiter.physical.position = { x: radius, y: 0, z: 0 };
    orbiter.physical.velocity = { x: 0, y: 0, z: Math.sqrt((G * parent.physical.mass) / radius) };
    const report = v.validateUniverse(universe);
    expect(has(report, v.ISSUE_CODES.ORBIT_INTERSECTS_PARENT)).toBe(true);
  });

  it('does not treat an unbound escape trajectory as an error', () => {
    const universe = template();
    universe.bodies[1].physical.velocity.z *= 1.6;
    const report = v.validateUniverse(universe);
    expect(has(report, v.ISSUE_CODES.ORBIT_ECCENTRICITY_EXTREME)).toBe(false);
    expect(report.errors).toEqual([]);
  });

  it('rejects superluminal relative orbital speeds', () => {
    const universe = template();
    universe.bodies[1].physical.velocity.z = 2 * C;
    expect(has(v.validateUniverse(universe), v.ISSUE_CODES.ORBIT_SUPERLUMINAL)).toBe(true);
  });

  it('reports coincident parent-body positions and offers a positional repair', () => {
    const universe = template();
    universe.bodies[1].physical.position = { ...universe.bodies[0].physical.position };
    const report = v.validateUniverse(universe);
    const issue = report.errors.find((entry) => entry.code === v.ISSUE_CODES.ORBIT_COINCIDENT);
    expect(issue?.repair?.kind).toBe('set-vector');
    const repaired = v.repairUniverse(universe, report);
    expect(has(v.validateUniverse(repaired), v.ISSUE_CODES.ORBIT_COINCIDENT)).toBe(false);
  });

  it('warns about implausibly large bound semi-major axes', () => {
    const universe = template();
    const radius = 1e26;
    universe.bodies[1].physical.position = { x: radius, y: 0, z: 0 };
    universe.bodies[1].physical.velocity = { x: 0, y: 0, z: Math.sqrt((G * universe.bodies[0].physical.mass) / radius) };
    expect(has(v.validateUniverse(universe), v.ISSUE_CODES.ORBIT_SEMIMAJOR_EXTREME)).toBe(true);
  });

  it('rejects non-finite and absurdly large total energies', () => {
    const nonFinite = template();
    nonFinite.bodies[1].physical.velocity.x = Number.NaN;
    expect(has(v.createReport(v.checkEnergySanity(nonFinite)), v.ISSUE_CODES.ENERGY_NON_FINITE)).toBe(true);
    const extreme = template();
    extreme.bodies[1].physical.mass = 1e35;
    extreme.bodies[1].physical.velocity.z = 1e8;
    expect(has(v.createReport(v.checkEnergySanity(extreme)), v.ISSUE_CODES.ENERGY_EXTREME)).toBe(true);
  });

  it('detects non-finite, drifting and superluminal net momentum', () => {
    const nonFinite = template();
    nonFinite.bodies[1].physical.velocity.x = Number.NaN;
    expect(has(v.createReport(v.checkMomentumSanity(nonFinite)), v.ISSUE_CODES.MOMENTUM_NON_FINITE)).toBe(true);
    const drifting = withOnly(template().bodies[0]);
    drifting.bodies[0].locked = false;
    drifting.bodies[0].physical.velocity.z = C * 0.05;
    expect(has(v.createReport(v.checkMomentumSanity(drifting)), v.ISSUE_CODES.MOMENTUM_DRIFT)).toBe(true);
    drifting.bodies[0].physical.velocity.z = 2 * C;
    expect(has(v.createReport(v.checkMomentumSanity(drifting)), v.ISSUE_CODES.MOMENTUM_SUPERLUMINAL)).toBe(true);
  });

  it('accepts balanced and zero-momentum systems', () => {
    const universe = template();
    expect(v.checkMomentumSanity(universe)).toEqual([]);
    const pair = template();
    pair.bodies[0].locked = false;
    pair.bodies[0].physical.velocity.z = 1000;
    pair.bodies[1].physical.velocity.z = -(pair.bodies[0].physical.mass / pair.bodies[1].physical.mass) * 1000;
    expect(v.checkMomentumSanity(pair)).toEqual([]);
  });
});

describe('collision overlap warnings', () => {
  it('warns when initial bodies overlap and stays quiet when they do not', () => {
    expect(v.checkCollisionOverlap(template())).toEqual([]);
    const universe = template();
    universe.bodies[1].physical.position = { ...universe.bodies[0].physical.position };
    const issues = v.checkCollisionOverlap(universe);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe(v.ISSUE_CODES.OVERLAP);
    expect(issues[0].details?.contactDistance).toBeGreaterThan(0);
  });

  it('notes when the pairwise overlap scan is truncated', () => {
    expect(has(v.createReport(v.checkCollisionOverlap(template(), 0)), v.ISSUE_CODES.OVERLAP_SCAN_TRUNCATED)).toBe(true);
  });
});

describe('integrator compatibility and universe settings', () => {
  it('warns when collisions are enabled with the none mode and repairs it', () => {
    const universe = template();
    universe.settings.collisionsEnabled = true;
    universe.settings.collisionMode = 'none';
    const report = v.validateUniverse(universe);
    expect(has(report, v.ISSUE_CODES.COLLISION_SETTINGS_MISMATCH)).toBe(true);
    const repaired = v.repairUniverse(universe, report);
    expect(repaired.settings.collisionMode).toBe('merge');
    expect(has(v.validateUniverse(repaired), v.ISSUE_CODES.COLLISION_SETTINGS_MISMATCH)).toBe(false);
  });

  it('warns about explicit Euler with a large timestep', () => {
    const universe = template();
    universe.settings.integrator = 'euler';
    universe.settings.timestep = 5000;
    const report = v.validateUniverse(universe);
    expect(has(report, v.ISSUE_CODES.TIMESTEP_TOO_LARGE)).toBe(true);
    const repaired = v.repairUniverse(universe, report);
    expect(repaired.settings.integrator).toBe('velocity-verlet');
  });

  it('notes when every body is locked', () => {
    const universe = template();
    for (const body of universe.bodies) body.locked = true;
    expect(has(v.createReport(v.checkIntegratorCompatibility(universe)), v.ISSUE_CODES.INTEGRATOR_MISMATCH)).toBe(true);
  });

  it('rejects invalid settings ranges and identifiers', () => {
    const universe = template();
    universe.settings.G = -1;
    universe.settings.softening = -10;
    universe.settings.timestep = 0;
    universe.settings.timeScale = Number.NaN;
    universe.settings.integrator = 'unstable' as Universe['settings']['integrator'];
    universe.settings.collisionMode = 'teleport' as Universe['settings']['collisionMode'];
    const report = v.createReport(v.checkUniverseSettings(universe.settings));
    expect(report.errors.length).toBeGreaterThanOrEqual(6);
    expect(report.byCode[v.ISSUE_CODES.SETTINGS_RANGE]).toBeGreaterThanOrEqual(4);
    expect(report.byCode[v.ISSUE_CODES.SETTINGS_INVALID_VALUE]).toBeGreaterThanOrEqual(2);
  });

  it('rejects non-boolean collision flags and accepts valid settings', () => {
    const universe = template();
    expect(v.checkUniverseSettings(universe.settings)).toEqual([]);
    const invalid = { ...universe.settings, collisionsEnabled: 'yes' };
    expect(has(v.createReport(v.checkUniverseSettings(invalid)), v.ISSUE_CODES.SETTINGS_INVALID_VALUE)).toBe(true);
  });

  it('warns about a zero softening length', () => {
    const universe = template();
    universe.settings.softening = 0;
    expect(has(v.createReport(v.checkUniverseSettings(universe.settings)), v.ISSUE_CODES.SETTINGS_INVALID_VALUE)).toBe(true);
  });
});

describe('scenario metadata validation', () => {
  const scenario = (): Scenario => structuredClone(getScenario('earth-moon')!);

  it('accepts a well-formed scenario', () => {
    expect(v.validateScenarioMetadata(scenario()).valid).toBe(true);
  });

  it('rejects missing text fields and unknown categories', () => {
    const broken = scenario();
    broken.educationalNotes = '';
    broken.category = 'unknown' as Scenario['category'];
    const report = v.validateScenarioMetadata(broken);
    expect(report.errors.length).toBeGreaterThanOrEqual(2);
    expect(has(report, v.ISSUE_CODES.SCENARIO_FIELD)).toBe(true);
  });

  it('rejects malformed camera tuples and distances', () => {
    const broken = scenario();
    broken.camera.position = [0, Number.NaN, 0];
    broken.camera.suggestedDistance = -1;
    const report = v.validateScenarioMetadata(broken);
    expect(report.byCode[v.ISSUE_CODES.SCENARIO_CAMERA]).toBeGreaterThanOrEqual(2);
  });

  it('prefixes nested universe issues with the scenario path', () => {
    const broken = scenario();
    broken.universe.bodies[1].physical.mass = Number.NaN;
    const report = v.validateScenarioMetadata(broken);
    expect(report.issues.some((issue) => issue.path.startsWith('scenario.universe.bodies[1]'))).toBe(true);
    expect(report.valid).toBe(false);
  });
});

describe('auto-repair suggestions', () => {
  it('collects unique repair actions from a report', () => {
    const duplicate = v.makeIssue(v.ISSUE_CODES.DUPLICATE_ID, 'error', 'a', 'bodies[1].id', {
      repair: { kind: 'set-string', path: 'bodies[1].id', value: 'x', description: 'rename' },
    });
    const report = v.createReport([duplicate, duplicate]);
    expect(v.collectRepairs(report)).toHaveLength(1);
  });

  it('repairs several independent problems in one pass', () => {
    const universe = template();
    universe.bodies[1].physical.mass = Number.NaN;
    universe.bodies[1].parentId = 'missing';
    universe.settings.timestep = Number.NaN;
    const report = v.validateUniverse(universe);
    const repaired = v.repairUniverse(universe, report);
    expect(repaired.bodies[1].physical.mass).toBe(1);
    expect(repaired.bodies[1].parentId).toBeNull();
    expect(repaired.settings.timestep).toBe(3600);
    expect(v.validateUniverse(repaired).errors).toEqual([]);
  });

  it('ignores repair paths outside the allowlist without mutating the universe', () => {
    const universe = template();
    const unsafe: RepairAction[] = [
      { kind: 'set-string', path: 'constructor.prototype.polluted', value: 'yes', description: 'unsafe' },
      { kind: 'set-number', path: 'bodies[99].physical.mass', value: 1, description: 'missing body' },
    ];
    const result = v.applyRepairs(universe, unsafe);
    expect(result).toEqual(universe);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('can remove a body by id', () => {
    const universe = template();
    const result = v.applyRepairs(universe, [
      { kind: 'remove-body', bodyId: universe.bodies[1].id, description: 'drop orbiter' },
    ]);
    expect(result.bodies).toHaveLength(1);
    expect(universe.bodies).toHaveLength(2);
  });

  it('ignores repairs carrying non-finite values', () => {
    const universe = template();
    const result = v.applyRepairs(universe, [
      { kind: 'set-number', path: 'settings.timestep', value: Number.NaN, description: 'bad' },
    ]);
    expect(result.settings.timestep).toBe(universe.settings.timestep);
  });
});
