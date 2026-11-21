import { asRecord, isVec3Like } from './guards';
import { bodyPath, makeIssue } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';

/** Presence and type checks. Numeric finiteness is handled by finiteState. */

const BODY_TYPES = new Set([
  'star',
  'planet',
  'dwarf',
  'moon',
  'asteroid',
  'comet',
  'custom',
  'blackhole',
]);

const INTEGRATORS = new Set(['euler', 'semi-implicit-euler', 'velocity-verlet', 'rk4']);
const COLLISION_MODES = new Set(['none', 'elastic', 'inelastic', 'merge']);

function requireKey(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
): unknown {
  if (record !== null && !(key in record)) {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_MISSING, 'error', `Missing required field '${key}'.`, `${path}.${key}`),
    );
  }
  return record?.[key];
}

function requireString(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: { allowEmpty?: boolean; allowed?: ReadonlySet<string> } = {},
): void {
  const value = requireKey(record, key, path, issues);
  if (value === undefined) return;
  const fieldPath = `${path}.${key}`;
  if (typeof value !== 'string') {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', `'${key}' must be a string.`, fieldPath),
    );
    return;
  }
  if (!options.allowEmpty && value.trim() === '') {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_EMPTY, 'error', `'${key}' must not be empty.`, fieldPath),
    );
  }
  if (options.allowed && !options.allowed.has(value)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.FIELD_INVALID_TYPE,
        'error',
        `'${key}' has unsupported value '${value}'.`,
        fieldPath,
      ),
    );
  }
}

function requireNumber(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
): void {
  const value = requireKey(record, key, path, issues);
  if (value === undefined) return;
  if (typeof value !== 'number') {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', `'${key}' must be a number.`, `${path}.${key}`),
    );
  }
}

function requireBoolean(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
): void {
  const value = requireKey(record, key, path, issues);
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', `'${key}' must be a boolean.`, `${path}.${key}`),
    );
  }
}

function requireRecord(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
): Record<string, unknown> | null {
  const value = requireKey(record, key, path, issues);
  const nested = asRecord(value);
  if (value !== undefined && nested === null) {
    issues.push(
      makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', `'${key}' must be an object.`, `${path}.${key}`),
    );
  }
  return nested;
}

function requireVector(
  record: Record<string, unknown> | null,
  key: string,
  path: string,
  issues: ValidationIssue[],
): Record<string, unknown> | null {
  const nested = requireRecord(record, key, path, issues);
  if (nested !== null && !isVec3Like(nested)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.FIELD_INVALID_TYPE,
        'error',
        `'${key}' must have finite x, y and z number fields.`,
        `${path}.${key}`,
      ),
    );
  }
  return nested;
}

function checkBody(value: unknown, index: number, issues: ValidationIssue[]): void {
  const path = bodyPath(index);
  const body = asRecord(value);
  if (body === null) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', 'Body must be an object.', path));
    return;
  }
  requireString(body, 'id', path, issues);
  requireString(body, 'name', path, issues);
  requireString(body, 'type', path, issues, { allowed: BODY_TYPES });
  if (!('parentId' in body)) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_MISSING, 'error', "Missing required field 'parentId'.", `${path}.parentId`));
  } else if (body.parentId !== null && typeof body.parentId !== 'string') {
    issues.push(makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', "'parentId' must be a string or null.", `${path}.parentId`));
  }
  requireBoolean(body, 'visible', path, issues);
  requireBoolean(body, 'locked', path, issues);
  requireString(body, 'notes', path, issues, { allowEmpty: true });

  const physical = requireRecord(body, 'physical', path, issues);
  if (physical !== null) {
    for (const key of ['mass', 'radius', 'rotation', 'rotationSpeed'] as const) {
      requireNumber(physical, key, `${path}.physical`, issues);
    }
    for (const key of ['position', 'velocity', 'acceleration'] as const) {
      requireVector(physical, key, `${path}.physical`, issues);
    }
  }

  const visual = requireRecord(body, 'visual', path, issues);
  if (visual !== null) {
    for (const key of ['color', 'emissive', 'atmosphereColor', 'ringColor'] as const) {
      requireString(visual, key, `${path}.visual`, issues, { allowEmpty: true });
    }
    requireString(visual, 'material', `${path}.visual`, issues);
    for (const key of ['emissiveIntensity', 'visualScale', 'opacity'] as const) {
      requireNumber(visual, key, `${path}.visual`, issues);
    }
    for (const key of ['atmosphere', 'rings', 'labelVisible'] as const) {
      requireBoolean(visual, key, `${path}.visual`, issues);
    }
    const trail = requireRecord(visual, 'trail', `${path}.visual`, issues);
    if (trail !== null) {
      requireBoolean(trail, 'enabled', `${path}.visual.trail`, issues);
      requireNumber(trail, 'length', `${path}.visual.trail`, issues);
      requireNumber(trail, 'opacity', `${path}.visual.trail`, issues);
      if (!('color' in trail)) {
        issues.push(makeIssue(ISSUE_CODES.FIELD_MISSING, 'error', "Missing required field 'color'.", `${path}.visual.trail.color`));
      } else if (trail.color !== null && typeof trail.color !== 'string') {
        issues.push(makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', "'color' must be a string or null.", `${path}.visual.trail.color`));
      }
    }
  }
}

export function checkRequiredFields(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const universe = asRecord(value);
  if (universe === null) {
    return [makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', 'Universe must be an object.', 'universe')];
  }
  requireString(universe, 'id', 'universe', issues);
  requireString(universe, 'name', 'universe', issues);
  requireString(universe, 'description', 'universe', issues, { allowEmpty: true });
  requireNumber(universe, 'createdAt', 'universe', issues);
  requireNumber(universe, 'updatedAt', 'universe', issues);

  if (!('bodies' in universe)) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_MISSING, 'error', "Missing required field 'bodies'.", 'bodies'));
  } else if (!Array.isArray(universe.bodies)) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', "'bodies' must be an array.", 'bodies'));
  } else {
    universe.bodies.forEach((body, index) => checkBody(body, index, issues));
  }

  if (!('tags' in universe)) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_MISSING, 'error', "Missing required field 'tags'.", 'tags'));
  } else if (!Array.isArray(universe.tags) || !universe.tags.every((tag) => typeof tag === 'string')) {
    issues.push(makeIssue(ISSUE_CODES.FIELD_INVALID_TYPE, 'error', "'tags' must contain only strings.", 'tags'));
  }

  const settings = requireRecord(universe, 'settings', 'universe', issues);
  if (settings !== null) {
    for (const key of ['G', 'softening', 'timestep', 'timeScale'] as const) {
      requireNumber(settings, key, 'settings', issues);
    }
    requireString(settings, 'integrator', 'settings', issues, { allowed: INTEGRATORS });
    requireString(settings, 'collisionMode', 'settings', issues, { allowed: COLLISION_MODES });
    requireBoolean(settings, 'collisionsEnabled', 'settings', issues);
  }
  return issues;
}
