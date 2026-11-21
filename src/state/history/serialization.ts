/** Dependency-free guards and coercions for restoring JSON-shaped state. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(value: unknown, fallback = 0): number {
  return isFiniteNumber(value) ? value : fallback;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Normalises a JSON capacity to a positive integer, falling back when invalid. */
export function clampCapacity(value: unknown, fallback: number): number {
  const source = isFiniteNumber(value) ? value : fallback;
  return Math.max(1, Math.floor(source));
}
