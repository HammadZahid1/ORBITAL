import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatDuration, formatScientific } from '../../../engine/numeric';
import { findCloseApproach } from '../../../engine/orbits/closeApproach';
import { bodyIndex } from '../../../engine/physics/world';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  StatusBadge,
} from '../../ui/extra';
import type { StatusBadgeTone } from '../../ui/extra';

interface LogEntry {
  key: string;
  label: string;
  time: number;
  distance: number;
  risk: string;
  tone: StatusBadgeTone;
}

const MAX_ENTRIES = 8;

/** Bounded in-session record of the closest sampled pair at each solver refresh. */
export function CloseApproachLogPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const simTime = useSimulationStore((state) => state.simTime);
  const integrator = useSimulationStore((state) => state.integrator);
  const timestep = useSimulationStore((state) => state.timestep);

  const entries = useRef<LogEntry[]>([]);
  const [version, setVersion] = useState(0);

  const closest = useMemo(() => {
    const selected = bodies.find((body) => body.id === selectedId) ?? null;
    if (!selected) return null;
    const world = engine.world;
    const index = bodyIndex(world, selected.id);
    if (index < 0) return null;
    const dt = Math.max(timestep, 1);
    let best: { label: string; distance: number; time: number; contact: number } | null = null;
    for (const other of bodies) {
      if (other.id === selected.id) continue;
      const otherIndex = bodyIndex(world, other.id);
      const approach = findCloseApproach(world, index, otherIndex, { steps: 6, dt, integrator });
      if (!approach || !Number.isFinite(approach.distance)) continue;
      const contact = world.radius[index] + world.radius[otherIndex];
      if (!best || approach.distance < best.distance) {
        best = {
          label: `${selected.name} ↔ ${other.name}`,
          distance: approach.distance,
          time: approach.time,
          contact: Number.isFinite(contact) ? contact : 0,
        };
      }
    }
    return best ? { selected, ...best } : null;
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, integrator, selectedId, timestep]);

  useEffect(() => {
    if (!closest) return;
    const key = `${closest.label}-${Math.round(closest.time)}`;
    if (entries.current[0]?.key === key) return;
    const ratio = closest.contact > 0 ? closest.distance / closest.contact : Infinity;
    const tone: StatusBadgeTone = ratio <= 1 ? 'danger' : ratio <= 10 ? 'warning' : 'success';
    const risk = ratio <= 1 ? 'contact' : ratio <= 10 ? 'near' : 'clear';
    entries.current = [
      { key, label: closest.label, time: simTime, distance: closest.distance, risk, tone },
      ...entries.current,
    ].slice(0, MAX_ENTRIES);
    setVersion((value) => value + 1);
  }, [closest, simTime]);

  const log = entries.current;
  void version;

  return (
    <Panel>
      <PanelHeader
        title="Close-Approach Log"
        subtitle={`${log.length} recorded sample${log.length === 1 ? '' : 's'}`}
        icon={<Clock size={14} />}
        actions={<StatusBadge tone="accent">session log</StatusBadge>}
      />
      <PanelSection title="Recent minima" dense>
        {log.length === 0 ? (
          <EmptyState
            title="No approach recorded"
            description="Select a reference body to start logging its closest sampled neighbour."
          />
        ) : (
          <div role="list" aria-label="Close approach log" className="space-y-2">
            {log.map((entry) => (
              <div key={entry.key} role="listitem" className="rounded-[3px] border border-(--line) px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] text-(--ink)">{entry.label}</span>
                  <StatusBadge tone={entry.tone}>{entry.risk}</StatusBadge>
                </div>
                <div className="orb-mono mt-1 text-[9px] text-(--faint)">
                  t = {formatDuration(entry.time)} · min separation {formatScientific(entry.distance, 3)} m
                </div>
              </div>
            ))}
          </div>
        )}
        {log.length > 0 && (
          <button
            type="button"
            onClick={() => {
              entries.current = [];
              setVersion((value) => value + 1);
            }}
            className="mt-3 rounded-[3px] border border-(--line) px-2 py-1 text-[10px] text-(--muted) transition-colors hover:border-(--accent) hover:text-(--ink) focus-visible:ring-1 focus-visible:ring-(--accent)"
          >
            Clear log
          </button>
        )}
      </PanelSection>
      <PanelSection title="Logging rule" dense>
        <InfoNote title="Sampled minima only" tone="info">
          One closest pair is stored per solver refresh using a short {formatScientific(timestep, 2)} s-step probe with{' '}
          {integrator}. The log is bounded to {MAX_ENTRIES} entries and is not an authoritative ephemeris.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
