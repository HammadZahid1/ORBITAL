import { Eye, EyeOff, Focus, GitCompareArrows } from 'lucide-react';
import { formatScientific } from '../../engine/numeric';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { EmptyState, IconButton } from '../ui';

/** Compact selectable list of bodies in the active universe. */
export function ObjectList({ filter }: { filter?: (bodyType: string) => boolean }) {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const setSelected = useSimulationStore((state) => state.setSelected);
  const updateBody = useSimulationStore((state) => state.updateBody);
  const requestCamera = useSimulationStore((state) => state.requestCamera);
  const comparisonIds = useUIStore((state) => state.comparisonIds);
  const toggleComparison = useUIStore((state) => state.toggleComparison);

  const visibleBodies = bodies.filter((body) => !filter || filter(body.type));
  if (visibleBodies.length === 0) {
    return <EmptyState title="No bodies" detail="Load a scenario or add a body in the Universe Builder." />;
  }

  return (
    <div className="orb-scroll max-h-64 space-y-0.5 overflow-y-auto">
      {visibleBodies.map((body) => {
        const selected = body.id === selectedId;
        return (
          <div
            key={body.id}
            className={`flex items-center gap-1.5 rounded-[3px] px-1.5 py-1.5 ${
              selected ? 'orb-selected-row' : 'orb-hover-row'
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: body.visual.color }} />
            <button
              type="button"
              onClick={() => setSelected(body.id)}
              className="min-w-0 flex-1 text-left"
              title={body.name}
            >
              <div className={`truncate text-[10px] ${selected ? 'text-accent' : 'text-ink'}`}>{body.name}</div>
              <div className="orb-mono truncate text-[8px] text-faint">
                {body.type} · {formatScientific(body.physical.mass, 1)} kg
              </div>
            </button>
            <IconButton
              label="Focus body"
              icon={<Focus size={12} />}
              size="sm"
              onClick={() => {
                setSelected(body.id);
                requestCamera();
              }}
            />
            <IconButton
              label="Compare body"
              icon={<GitCompareArrows size={12} />}
              size="sm"
              active={comparisonIds.includes(body.id)}
              onClick={() => toggleComparison(body.id)}
            />
            <IconButton
              label={body.visible ? 'Hide body' : 'Show body'}
              icon={body.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              size="sm"
              onClick={() => updateBody(body.id, { visible: !body.visible })}
            />
          </div>
        );
      })}
    </div>
  );
}
