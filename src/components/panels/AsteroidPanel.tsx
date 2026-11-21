import { useMemo, useState } from 'react';
import { Telescope } from 'lucide-react';
import { findCloseApproach } from '../../engine/orbits/closeApproach';
import { bodyIndex } from '../../engine/physics/world';
import { formatDuration, formatScientific } from '../../engine/numeric';
import { AU } from '../../engine/numeric';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, NumberField, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';
import { ObjectList } from './ObjectList';

/** Asteroid Observatory with predicted close approaches to major bodies. */
export function AsteroidPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const integrator = useSimulationStore((state) => state.integrator);
  const [horizonDays, setHorizonDays] = useState(3650);
  const smallBodies = bodies.filter((body) => body.type === 'asteroid' || body.type === 'comet');
  const selected = bodies.find((body) => body.id === selectedId);
  const targets = bodies.filter((body) => body.type === 'planet' && body.id !== selectedId).slice(0, 4);

  const approaches = useMemo(() => {
    if (!selected || smallBodies.length === 0) return [];
    const index = bodyIndex(engine.world, selected.id);
    if (index < 0) return [];
    const steps = Math.max(4, Math.min(1200, Math.round((horizonDays * 86400) / Math.max(engine.options.timestep, 3600))));
    return targets
      .map((target) => {
        const targetIndex = bodyIndex(engine.world, target.id);
        const approach = findCloseApproach(engine.world, index, targetIndex, {
          steps,
          dt: engine.options.timestep,
          integrator,
          sampleEvery: Math.max(1, Math.floor(steps / 80)),
        });
        return approach ? { target, approach } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.approach.distance - b.approach.distance);
    // Frame dependency refreshes the forecast as the solver advances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, horizonDays, integrator, selected, targets]);

  return (
    <Panel>
      <PanelHeader
        title="Asteroid Observatory"
        subtitle="Small-body tracking and close approaches"
        icon={<Telescope size={14} />}
        actions={<Badge tone="accent">{smallBodies.length} tracked</Badge>}
      />
      <PanelSection title="Small bodies" dense>
        <ObjectList filter={(type) => type === 'asteroid' || type === 'comet'} />
      </PanelSection>
      <PanelSection title="Forecast" dense>
        <NumberField label="Horizon (days)" value={horizonDays} min={30} max={36500} step={365} onChange={setHorizonDays} />
        {selected && (
          <PropertyRow label="Selected" value={`${selected.name} (${selected.type})`} accent />
        )}
        {approaches.map(({ target, approach }) => (
          <div key={target.id} className="mt-2 rounded-[3px] border border-line px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink">{target.name}</span>
              <span className="orb-mono text-[10px] text-warn">{(approach.distance / AU).toFixed(4)} AU</span>
            </div>
            <div className="orb-mono mt-0.5 text-[9px] text-faint">
              closest at t + {formatDuration(approach.time)} · {formatScientific(approach.distance, 2)} m
            </div>
          </div>
        ))}
        {approaches.length === 0 && (
          <p className="mt-2 text-[9px] leading-relaxed text-faint">
            Select an asteroid or comet to compare its predicted path with major planets.
          </p>
        )}
      </PanelSection>
    </Panel>
  );
}
