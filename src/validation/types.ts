import type { Vec3 } from '../types/vector';
import type { Severity, SeverityCounts } from './severity';

/** Stable identifiers for validation findings. */
export const ISSUE_CODES = {
  SCHEMA_VERSION_MISSING: 'schema.version.missing',
  SCHEMA_VERSION_UNSUPPORTED: 'schema.version.unsupported',
  IMPORT_MALFORMED_JSON: 'import.json.malformed',
  IMPORT_NOT_OBJECT: 'import.not-object',
  IMPORT_MISSING_DATA: 'import.data.missing',
  IMPORT_UNSAFE_KEY: 'import.unsafe-key',
  IMPORT_TOO_LARGE: 'import.too-large',
  IMPORT_TOO_DEEP: 'import.too-deep',
  IMPORT_TOO_MANY_BODIES: 'import.too-many-bodies',
  IMPORT_SHAPE_INVALID: 'import.shape.invalid',
  UNIVERSE_KIND_MISMATCH: 'import.kind.mismatch',
  FIELD_MISSING: 'field.missing',
  FIELD_INVALID_TYPE: 'field.type',
  FIELD_EMPTY: 'field.empty',
  UNIVERSE_EMPTY: 'universe.empty',
  NON_FINITE_NUMBER: 'state.non-finite',
  MASS_OUT_OF_RANGE: 'body.mass.range',
  RADIUS_OUT_OF_RANGE: 'body.radius.range',
  DENSITY_EXTREME: 'body.density.extreme',
  DUPLICATE_ID: 'body.id.duplicate',
  DUPLICATE_NAME: 'body.name.duplicate',
  PARENT_MISSING: 'hierarchy.parent.missing',
  PARENT_SELF: 'hierarchy.parent.self',
  HIERARCHY_CYCLE: 'hierarchy.cycle',
  HIERARCHY_DEEP: 'hierarchy.deep',
  ORBIT_COINCIDENT: 'orbit.coincident',
  ORBIT_NON_FINITE: 'orbit.non-finite',
  ORBIT_ECCENTRICITY_EXTREME: 'orbit.eccentricity.extreme',
  ORBIT_INTERSECTS_PARENT: 'orbit.intersects-parent',
  ORBIT_SUPERLUMINAL: 'orbit.superluminal',
  ORBIT_SEMIMAJOR_EXTREME: 'orbit.semimajor.extreme',
  ENERGY_NON_FINITE: 'energy.non-finite',
  ENERGY_EXTREME: 'energy.extreme',
  MOMENTUM_NON_FINITE: 'momentum.non-finite',
  MOMENTUM_DRIFT: 'momentum.drift',
  MOMENTUM_SUPERLUMINAL: 'momentum.superluminal',
  OVERLAP: 'collision.overlap',
  OVERLAP_SCAN_TRUNCATED: 'collision.scan-truncated',
  SCALE_EXTREME: 'scale.extreme',
  VISUAL_SCALE_EXTREME: 'visual.scale.extreme',
  SETTINGS_RANGE: 'settings.range',
  SETTINGS_INVALID_VALUE: 'settings.invalid',
  INTEGRATOR_MISMATCH: 'integrator.mismatch',
  COLLISION_SETTINGS_MISMATCH: 'collision.settings.mismatch',
  TIMESTEP_TOO_LARGE: 'integrator.timestep',
  SCENARIO_FIELD: 'scenario.field',
  SCENARIO_CAMERA: 'scenario.camera',
} as const;

export type IssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES];

/** A concrete, safe change that would address an issue. */
export type RepairAction =
  | { kind: 'set-number'; path: string; value: number; description: string }
  | { kind: 'set-vector'; path: string; value: Vec3; description: string }
  | { kind: 'set-string'; path: string; value: string; description: string }
  | { kind: 'set-boolean'; path: string; value: boolean; description: string }
  | { kind: 'set-null'; path: string; description: string }
  | { kind: 'remove-body'; bodyId: string; description: string };

export type IssueDetailValue = string | number | boolean | null;

/** A single validation finding. Paths use `bodies[0].physical.mass` notation. */
export interface ValidationIssue {
  code: IssueCode;
  severity: Severity;
  message: string;
  path: string;
  bodyId?: string;
  repair?: RepairAction;
  details?: Readonly<Record<string, IssueDetailValue>>;
}

export interface ValidationReport {
  /** True when there are no error-severity issues. */
  valid: boolean;
  /** Overall level, or 'ok' for a report with no issues. */
  level: Severity | 'ok';
  issues: ValidationIssue[];
  counts: SeverityCounts;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  byCode: Readonly<Record<string, number>>;
}

export interface ValidationOptions {
  /** Guard against pathologically large imports. */
  maxBodies?: number;
  /** Maximum accepted import text length in UTF-16 code units. */
  maxImportBytes?: number;
  /** Maximum object/array nesting depth accepted by the importer. */
  maxImportDepth?: number;
  /** Envelope version required by schema checks. */
  expectedSchemaVersion?: number;
  /** Maximum number of pairwise overlap comparisons. */
  maxOverlapPairs?: number;
}

export const DEFAULT_VALIDATION_OPTIONS: Required<ValidationOptions> = {
  maxBodies: 4096,
  maxImportBytes: 5 * 1024 * 1024,
  maxImportDepth: 64,
  expectedSchemaVersion: 1,
  maxOverlapPairs: 500_000,
};

export function resolveOptions(options?: ValidationOptions): Required<ValidationOptions> {
  return { ...DEFAULT_VALIDATION_OPTIONS, ...options };
}
