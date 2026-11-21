import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../state/defaults';
import { safeGet, safeSet } from './localStorage';
import { normaliseSettings, unwrap, wrap } from './schema';

const SETTINGS_KEY = 'settings';

export function loadSettings(): AppSettings {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return structuredClone(DEFAULT_SETTINGS);
  const settings = unwrap<AppSettings>(raw, 'settings', () => true);
  return normaliseSettings(settings);
}

export function saveSettings(settings: AppSettings): boolean {
  return safeSet(SETTINGS_KEY, JSON.stringify(wrap('settings', settings)));
}
