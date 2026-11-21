import type { ComponentType } from 'react';
import { useUIStore } from '../../state/uiStore';
import type { ModuleId } from '../../types/celestial';
import { AnalyticsPanel } from './AnalyticsPanel';
import { AsteroidPanel } from './AsteroidPanel';
import { BuilderPanel } from './BuilderPanel';
import { ExplorerPanel } from './ExplorerPanel';
import { ExtremePanel } from './ExtremePanel';
import { GravityPanel } from './GravityPanel';
import { MissionPanel } from './MissionPanel';
import { OrbitalPanel } from './OrbitalPanel';
import { SavedPanel } from './SavedPanel';
import { SolarSystemPanel } from './SolarSystemPanel';
import { StellarPanel } from './StellarPanel';

const PANELS: Record<ModuleId, ComponentType> = {
  explorer: ExplorerPanel,
  'solar-system': SolarSystemPanel,
  orbital: OrbitalPanel,
  gravity: GravityPanel,
  builder: BuilderPanel,
  asteroids: AsteroidPanel,
  stellar: StellarPanel,
  extreme: ExtremePanel,
  mission: MissionPanel,
  analytics: AnalyticsPanel,
  saved: SavedPanel,
};

/** Hosts the contextual tool panel for the active workspace. */
export function ModulePanelHost({ compact: _compact = false }: { compact?: boolean }) {
  const activeModule = useUIStore((state) => state.activeModule);
  const PanelComponent = PANELS[activeModule];
  return <PanelComponent />;
}
