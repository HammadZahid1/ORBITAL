import { G as STANDARD_G } from '../engine/numeric';
import { isFiniteNumber } from './guards';
import { makeIssue, setBooleanRepair, setNumberRepair, setStringRepair } from './issues';
import { ISSUE_CODES } from './types';
import type { ValidationIssue } from './types';
import type { UniverseSettings } from '../types/celestial';

/** Range and consistency checks for the solver settings block. */

const INTEGRATORS = new Set(['euler', 'semi-implicit-euler', 'velocity-verlet', 'rk4']);
const COLLISION_MODES = new Set(['none', 'elastic', 'inelastic', 'merge']);
const MIN_G = 1e-14;
const MAX_G = 1e-3;
const MAX_TIME_SCALE = 1e8;

export function checkUniverseSettings(value: UniverseSettings | unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const settings = value as Partial<UniverseSettings> | null | undefined;
  if (settings === null || settings === undefined || typeof settings !== 'object') {
    return [makeIssue(ISSUE_CODES.SETTINGS_INVALID_VALUE, 'error', 'Universe settings must be an object.', 'settings')];
  }

  if (!isFiniteNumber(settings.G) || settings.G <= 0) {
    issues.push(
      makeIssue(ISSUE_CODES.SETTINGS_RANGE, 'error', 'G must be a positive finite number.', 'settings.G', {
        details: { value: String(settings.G) },
        repair: setNumberRepair('settings.G', STANDARD_G, 'Restore the standard gravitational constant.'),
      }),
    );
  } else if (settings.G < MIN_G || settings.G > MAX_G) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'warning',
        'G is far outside the expected Newtonian range.',
        'settings.G',
        { details: { value: settings.G } },
      ),
    );
  }

  if (!isFiniteNumber(settings.softening) || settings.softening < 0) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_RANGE,
        'error',
        'Softening length must be finite and non-negative.',
        'settings.softening',
        { repair: setNumberRepair('settings.softening', 1e5, 'Use a 100 km softening length.') },
      ),
    );
  } else if (settings.softening === 0) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'warning',
        'Zero softening permits infinite forces during close encounters.',
        'settings.softening',
        { repair: setNumberRepair('settings.softening', 1e5, 'Use a small positive softening length.') },
      ),
    );
  }

  if (!isFiniteNumber(settings.timestep) || settings.timestep <= 0) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_RANGE,
        'error',
        'Timestep must be a positive finite number of seconds.',
        'settings.timestep',
        { repair: setNumberRepair('settings.timestep', 3600, 'Use a one-hour timestep.') },
      ),
    );
  }

  if (!isFiniteNumber(settings.timeScale) || settings.timeScale <= 0) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_RANGE,
        'error',
        'Time scale must be a positive finite number.',
        'settings.timeScale',
        { repair: setNumberRepair('settings.timeScale', 3600, 'Use a 1x time scale baseline.') },
      ),
    );
  } else if (settings.timeScale > MAX_TIME_SCALE) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'warning',
        'Time scale is extremely large; the clock may jump over events.',
        'settings.timeScale',
        { details: { value: settings.timeScale } },
      ),
    );
  }

  if (!INTEGRATORS.has(settings.integrator as string)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'error',
        'Unknown integrator identifier.',
        'settings.integrator',
        {
          details: { value: String(settings.integrator) },
          repair: setStringRepair('settings.integrator', 'velocity-verlet', 'Use Velocity Verlet.'),
        },
      ),
    );
  }

  if (!COLLISION_MODES.has(settings.collisionMode as string)) {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'error',
        'Unknown collision mode identifier.',
        'settings.collisionMode',
        {
          details: { value: String(settings.collisionMode) },
          repair: setStringRepair('settings.collisionMode', 'none', 'Disable collisions.'),
        },
      ),
    );
  }

  if (typeof settings.collisionsEnabled !== 'boolean') {
    issues.push(
      makeIssue(
        ISSUE_CODES.SETTINGS_INVALID_VALUE,
        'error',
        'collisionsEnabled must be a boolean.',
        'settings.collisionsEnabled',
        { repair: setBooleanRepair('settings.collisionsEnabled', false, 'Disable collisions.') },
      ),
    );
  }
  return issues;
}
