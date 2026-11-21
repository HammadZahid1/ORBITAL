import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { SCENARIOS } from '../../scenarios/registry';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { IconButton, Tooltip } from '../ui';
import { Timeline } from './Timeline';

/** Bottom drawer containing the transport and quick scenario launcher. */
export function BottomPanel() {
  const collapsed = useUIStore((state) => state.bottomCollapsed);
  const toggleBottom = useUIStore((state) => state.toggleBottom);
  const height = useUIStore((state) => state.bottomHeight);
  const setBottomHeight = useUIStore((state) => state.setBottomHeight);
  const scenarioId = useSimulationStore((state) => state.scenarioId);
  const loadScenario = useSimulationStore((state) => state.loadScenario);
  const notify = useUIStore((state) => state.notify);

  if (collapsed) {
    return (
      <div className="relative z-20 flex h-8 shrink-0 items-center justify-center border-t border-line bg-space/95">
        <IconButton label="Expand timeline" icon={<ChevronUp size={14} />} onClick={toggleBottom} />
      </div>
    );
  }

  return (
    <div
      className="relative z-20 flex shrink-0 flex-col border-t border-line bg-space/95"
      style={{ height }}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.hasAttribute('data-resize-handle')) return;
        const startY = event.clientY;
        const startHeight = height;
        const move = (moveEvent: PointerEvent) => setBottomHeight(startHeight + startY - moveEvent.clientY);
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
    >
      <div
        data-resize-handle="true"
        className="flex h-3 cursor-ns-resize items-center justify-center text-faint"
        title="Drag to resize"
      >
        <GripHorizontal size={14} />
      </div>
      <div className="min-h-0 flex-1">
        <Timeline />
      </div>
      <div className="orb-scroll flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-t border-line-soft px-3">
        <span className="orb-label mr-2 shrink-0">Scenarios</span>
        {SCENARIOS.map((scenario) => (
          <Tooltip key={scenario.id} label={scenario.description}>
            <button
              type="button"
              onClick={() => {
                loadScenario(scenario);
                notify(`Loaded ${scenario.name}`);
              }}
              className={`shrink-0 rounded-[2px] border px-2 py-1 text-[9px] transition-colors ${
                scenario.id === scenarioId
                  ? 'border-accent/50 bg-accent/12 text-accent'
                  : 'border-line text-muted hover:border-accent/40 hover:text-ink'
              }`}
            >
              {scenario.name}
            </button>
          </Tooltip>
        ))}
        <IconButton label="Collapse timeline" icon={<ChevronDown size={14} />} onClick={toggleBottom} />
      </div>
    </div>
  );
}
