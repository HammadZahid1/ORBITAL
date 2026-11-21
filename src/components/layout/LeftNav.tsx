import {
  Atom,
  Boxes,
  ChartNoAxesCombined,
  CircleDot,
  Compass,
  Crosshair,
  Database,
  FlaskConical,
  Orbit,
  Sparkles,
  Telescope,
  type LucideIcon,
} from 'lucide-react';
import { MODULES, type ModuleDefinition } from '../../state/moduleRegistry';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { Tooltip } from '../ui';

const ICONS: Record<ModuleDefinition['id'], LucideIcon> = {
  explorer: Compass,
  'solar-system': Orbit,
  builder: Boxes,
  orbital: CircleDot,
  gravity: Atom,
  asteroids: Telescope,
  stellar: Sparkles,
  extreme: Crosshair,
  mission: FlaskConical,
  analytics: ChartNoAxesCombined,
  saved: Database,
};

const GROUP_LABELS: Record<ModuleDefinition['group'], string> = {
  explore: 'Explore',
  construct: 'Construct',
  analyse: 'Analyse',
  library: 'Library',
};

/** Primary workspace navigation. */
export function LeftNav() {
  const activeModule = useUIStore((state) => state.activeModule);
  const setModule = useUIStore((state) => state.setModule);
  const collapsed = useUIStore((state) => state.leftCollapsed);
  const width = useUIStore((state) => state.leftWidth);
  const bodyCount = useSimulationStore((state) => state.bodies.length);
  const scenarioId = useSimulationStore((state) => state.scenarioId);

  if (collapsed) return null;

  return (
    <nav
      aria-label="Modules"
      className="orb-scroll relative z-20 flex shrink-0 flex-col overflow-y-auto border-r border-line bg-panel/95"
      style={{ width }}
    >
      <div className="px-3 pb-1 pt-4">
        <div className="orb-label">Workspaces</div>
      </div>
      <div className="space-y-3 px-2 pb-4">
        {(['explore', 'construct', 'analyse', 'library'] as const).map((group) => (
          <div key={group}>
            <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-faint/70">
              {GROUP_LABELS[group]}
            </div>
            <div className="space-y-0.5">
              {MODULES.filter((module) => module.group === group).map((module) => {
                const Icon = ICONS[module.id];
                const active = module.id === activeModule;
                return (
                  <Tooltip key={module.id} label={module.description}>
                    <button
                      type="button"
                      onClick={() => setModule(module.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-[3px] px-2 py-2 text-left text-[11px] transition-colors ${
                        active
                          ? 'bg-accent/12 text-accent shadow-[inset_2px_0_0_var(--accent)]'
                          : 'text-muted hover:bg-white/4 hover:text-ink'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="truncate">{module.shortLabel}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-line px-3 py-3">
        <div className="orb-label mb-2">Active system</div>
        <div className="orb-mono truncate text-[10px] text-ink">{scenarioId}</div>
        <div className="mt-1 text-[10px] text-faint">{bodyCount} simulated bodies</div>
      </div>
    </nav>
  );
}
