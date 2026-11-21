import { create } from 'zustand';
import type { ModuleId } from '../types/celestial';
import type { AppSettings } from '../types/settings';
import type { LayerConfiguration, LayerId, RenderQuality } from '../types/visualization';
import type { ScaleMode } from '../engine/coordinates/scale';
import { DEFAULT_LAYERS, DEFAULT_SETTINGS } from './defaults';
import { loadSettings, saveSettings } from '../storage/settings';

export interface Notification {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
}

interface UIState {
  activeModule: ModuleId;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  bottomHeight: number;
  leftWidth: number;
  rightWidth: number;
  commandOpen: boolean;
  settingsOpen: boolean;
  helpOpen: boolean;
  layers: LayerConfiguration;
  settings: AppSettings;
  notifications: Notification[];
  comparisonIds: string[];
  focusMode: boolean;
  reducedMotionOverride: boolean;
  scaleMode: ScaleMode;
  setScaleMode: (mode: ScaleMode) => void;
  setModule: (module: ModuleId) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleBottom: () => void;
  setBottomHeight: (height: number) => void;
  setLeftWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  setCommandOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  toggleLayer: (id: LayerId) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
  setLayerIntensity: (id: LayerId, intensity: number) => void;
  setLayers: (layers: LayerConfiguration) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setQuality: (quality: RenderQuality) => void;
  notify: (message: string, tone?: Notification['tone']) => void;
  dismissNotification: (id: string) => void;
  toggleComparison: (id: string) => void;
  setFocusMode: (focus: boolean) => void;
  resetLayout: () => void;
}

let notificationCounter = 0;

export const useUIStore = create<UIState>()((set, get) => ({
  activeModule: 'explorer',
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: false,
  bottomHeight: 216,
  leftWidth: 258,
  rightWidth: 316,
  commandOpen: false,
  settingsOpen: false,
  helpOpen: false,
  layers: structuredClone(DEFAULT_LAYERS),
  settings: loadSettings(),
  notifications: [],
  comparisonIds: [],
  focusMode: false,
  reducedMotionOverride: false,
  scaleMode: 'exploration',

  setScaleMode: (mode) => set({ scaleMode: mode }),

  setModule: (module) => set({ activeModule: module }),
  toggleLeft: () => set({ leftCollapsed: !get().leftCollapsed }),
  toggleRight: () => set({ rightCollapsed: !get().rightCollapsed }),
  toggleBottom: () => set({ bottomCollapsed: !get().bottomCollapsed }),
  setBottomHeight: (height) => set({ bottomHeight: Math.max(120, Math.min(520, height)) }),
  setLeftWidth: (width) => set({ leftWidth: Math.max(200, Math.min(420, width)) }),
  setRightWidth: (width) => set({ rightWidth: Math.max(240, Math.min(520, width)) }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleLayer: (id) => {
    const layers = get().layers;
    set({ layers: { ...layers, [id]: { ...layers[id], visible: !layers[id].visible } } });
  },
  setLayerOpacity: (id, opacity) => {
    const layers = get().layers;
    set({ layers: { ...layers, [id]: { ...layers[id], opacity: Math.max(0, Math.min(1, opacity)) } } });
  },
  setLayerIntensity: (id, intensity) => {
    const layers = get().layers;
    set({ layers: { ...layers, [id]: { ...layers[id], intensity: Math.max(0, Math.min(3, intensity)) } } });
  },
  setLayers: (layers) => set({ layers }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    saveSettings(settings);
  },
  setQuality: (quality) => {
    const settings = get().settings;
    const presets = {
      low: { particleDensity: 0.2, maxAsteroids: 60, trailLength: 80, pixelRatioCap: 1, shadows: false },
      balanced: { particleDensity: 0.6, maxAsteroids: 200, trailLength: 240, pixelRatioCap: 1.5, shadows: false },
      high: { particleDensity: 1, maxAsteroids: 500, trailLength: 500, pixelRatioCap: 2, shadows: true },
    };
    const performance =
      quality === 'custom' ? settings.performance : { ...settings.performance, ...presets[quality], quality };
    get().updateSettings({ performance });
  },
  notify: (message, tone = 'info') => {
    notificationCounter += 1;
    const notification: Notification = {
      id: `note-${notificationCounter}`,
      message,
      tone,
      createdAt: Date.now(),
    };
    set({ notifications: [...get().notifications.slice(-3), notification] });
    window.setTimeout(() => get().dismissNotification(notification.id), 4200);
  },
  dismissNotification: (id) => set({ notifications: get().notifications.filter((note) => note.id !== id) }),
  toggleComparison: (id) => {
    const ids = get().comparisonIds;
    set({ comparisonIds: ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id].slice(-4) });
  },
  setFocusMode: (focus) => set({ focusMode: focus }),
  resetLayout: () =>
    set({
      leftCollapsed: false,
      rightCollapsed: false,
      bottomCollapsed: false,
      bottomHeight: 216,
      leftWidth: 258,
      rightWidth: 316,
      focusMode: false,
    }),
}));

export const prefersReducedMotion = (): boolean =>
  get().reducedMotionOverride ||
  get().settings.reduceMotion ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function get() {
  return useUIStore.getState();
}
