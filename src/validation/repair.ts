import type { Universe } from '../types/celestial';
import type { Vec3 } from '../types/vector';
import { isFiniteNumber, isRecord } from './guards';
import type { RepairAction, ValidationReport } from './types';

/** Suggestion collection and conservative application of suggested repairs. */

function isRepairable(path: string, kind: RepairAction['kind']): boolean {
  if (/^bodies\[\d+\]\.physical\.(mass|radius|rotation|rotationSpeed)$/.test(path)) {
    return kind === 'set-number';
  }
  if (/^bodies\[\d+\]\.physical\.(position|velocity|acceleration)(\.(x|y|z))?$/.test(path)) {
    return kind === 'set-number' || kind === 'set-vector';
  }
  if (/^bodies\[\d+\]\.visual\.(visualScale|opacity|emissiveIntensity)$/.test(path)) {
    return kind === 'set-number';
  }
  if (/^bodies\[\d+\]\.visual\.trail\.(length|opacity)$/.test(path)) {
    return kind === 'set-number';
  }
  if (/^bodies\[\d+\]\.parentId$/.test(path)) {
    return kind === 'set-null' || kind === 'set-string';
  }
  if (/^bodies\[\d+\]\.name$/.test(path)) return kind === 'set-string';
  if (/^settings\.(G|softening|timestep|timeScale)$/.test(path)) return kind === 'set-number';
  if (/^settings\.collisionsEnabled$/.test(path)) return kind === 'set-boolean';
  if (/^settings\.(integrator|collisionMode)$/.test(path)) return kind === 'set-string';
  if (/^(createdAt|updatedAt)$/.test(path)) return kind === 'set-number';
  return false;
}

function actionKey(action: RepairAction): string {
  return action.kind === 'remove-body'
    ? `${action.kind}:${action.bodyId}`
    : `${action.kind}:${action.path}:${String('value' in action ? action.value : '')}`;
}

/** Deduplicates suggestions while preserving check order. */
export function collectRepairs(report: ValidationReport): RepairAction[] {
  const seen = new Set<string>();
  const repairs: RepairAction[] = [];
  for (const issue of report.issues) {
    if (issue.repair === undefined) continue;
    const key = actionKey(issue.repair);
    if (seen.has(key)) continue;
    seen.add(key);
    repairs.push(issue.repair);
  }
  return repairs;
}

function resolveTarget(
  root: Record<string, unknown>,
  path: string,
): { parent: Record<string, unknown>; key: string } | null {
  const tokens = path.split('.');
  let current: unknown = root;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    const indexed = /^([A-Za-z]+)\[(\d+)\]$/.exec(token);
    if (indexed !== null) {
      const array = isRecord(current) ? current[indexed[1]] : undefined;
      if (!Array.isArray(array)) return null;
      current = array[Number(indexed[2])];
    } else {
      current = isRecord(current) ? current[token] : undefined;
    }
  }
  if (!isRecord(current)) return null;
  return { parent: current, key: tokens[tokens.length - 1] };
}

function hasValidValue(action: RepairAction): boolean {
  switch (action.kind) {
    case 'set-number':
      return isFiniteNumber(action.value);
    case 'set-vector':
      return [action.value.x, action.value.y, action.value.z].every(isFiniteNumber);
    case 'set-string':
      return action.value.length > 0;
    case 'set-boolean':
      return typeof action.value === 'boolean';
    case 'set-null':
    case 'remove-body':
      return true;
  }
}

/**
 * Applies only whitelisted, type-safe repairs to a clone. Unknown paths are
 * ignored so imported data can never steer a write outside the universe.
 */
export function applyRepairs(universe: Universe, actions: readonly RepairAction[]): Universe {
  const clone = structuredClone(universe) as unknown as Record<string, unknown>;
  const bodies = Array.isArray(clone.bodies) ? clone.bodies : [];
  for (const action of actions) {
    if (!hasValidValue(action)) continue;
    if (action.kind === 'remove-body') {
      const index = bodies.findIndex((body) => isRecord(body) && body.id === action.bodyId);
      if (index >= 0) bodies.splice(index, 1);
      continue;
    }
    if (!isRepairable(action.path, action.kind)) continue;
    const target = resolveTarget(clone, action.path);
    if (target === null) continue;
    switch (action.kind) {
      case 'set-number':
      case 'set-vector':
      case 'set-string':
      case 'set-boolean':
        target.parent[target.key] = action.value satisfies number | Vec3 | string | boolean;
        break;
      case 'set-null':
        target.parent[target.key] = null;
        break;
    }
  }
  return clone as unknown as Universe;
}

export function repairUniverse(universe: Universe, report: ValidationReport): Universe {
  return applyRepairs(universe, collectRepairs(report));
}
