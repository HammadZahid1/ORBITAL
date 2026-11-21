import { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { impactKineticEnergy } from '../../../engine/analysis/astrophysics';
import { detectCollisions } from '../../../engine/collision/collision';
import { formatDuration, formatScientific } from '../../../engine/numeric';
import { findCloseApproach } from '../../../engine/orbits/closeApproach';
import { bodyIndex } from '../../../engine/physics/world';
import { length3, sub3 } from '../../../engine/vector';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  StatusBadge,
} from '../../ui/extra';
import type { StatusBadgeTone } from '../../ui/extra';

function radiusOf(float: Float64Array, index: number): number {
  return index >= 0 ? float[index] : NaN;
}

/** Current and short-horizon collision risk for the selected body. */
export function CollisionRiskPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const timestep = useSimulationStore((state) => state.timestep);
  const integrator = useSimulationStore((state) => state.integrator);
  const collisionsEnabled = useSimulationStore((state) => state.collisionsEnabled);
  const collisionMode = useSimulationStore((state) => state.collisionMode);

  const report = useMemo(() => {
    const selected = bodies.find((body) => body.id === selectedId) ?? null;
    if (!selected) return null;
    const world = engine.world;
    const index = bodyIndex(world, selected.id);
    if (index < 0) return null;
    const dt = Math.max(timestep, 1);
    const others = bodies
      .filter((body) => body.id !== selected.id && Number.isFinite(body.physical.mass))
      .slice(0, 6);
    const candidates = others
      .map((other) => {
        const otherIndex = bodyIndex(world, other.id);
        if (otherIndex < 0) return null;
        const separation = length3(
          sub3(
            { x: world.pos[index * 3], y: world.pos[index * 3 + 1], z: world.pos[index * 3 + 2] },
            { x: world.pos[otherIndex * 3], y: world.pos[otherIndex * 3 + 1], z: world.pos[otherIndex * 3 + 2] },
          ),
        );
        const relativeSpeed = length3(
          sub3(
            { x: world.vel[index * 3], y: world.vel[index * 3 + 1], z: world.vel[index * 3 + 2] },
            { x: world.vel[otherIndex * 3], y: world.vel[otherIndex * 3 + 1], z: world.vel[otherIndex * 3 + 2] },
          ),
        );
        const contact = radiusOf(world.radius, index) + radiusOf(world.radius, otherIndex);
        const approach = findCloseApproach(world, index, otherIndex, { steps: 8, dt, integrator });
        const totalMass = world.mass[index] + world.mass[otherIndex];
        const reducedMass = totalMass > 0 ? (world.mass[index] * world.mass[otherIndex]) / totalMass : 0;
        let energy = NaN;
        try {
          energy = impactKineticEnergy(Math.max(0, reducedMass), relativeSpeed);
        } catch {
          energy = NaN;
        }
        return { other, separation, relativeSpeed, contact, approach, energy };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.separation / Math.max(a.contact, 1) - b.separation / Math.max(b.contact, 1));
    const activeEvents = detectCollisions(world).length;
    return { selected, candidates, activeEvents };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, integrator, selectedId, timestep]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Collision Risk" icon={<Shield size={14} />} />
        <EmptyState
          title="No reference body"
          description="Select a body to compare its path with the other objects in the scene."
        />
      </Panel>
    );
  }

  function riskOf(separation: number, contact: number): { label: string; tone: StatusBadgeTone } {
    if (!Number.isFinite(separation) || !Number.isFinite(contact) || contact <= 0) {
      return { label: 'unknown', tone: 'neutral' };
    }
    if (separation <= contact) return { label: 'contact', tone: 'danger' };
    if (separation <= contact * 1.5) return { label: 'high', tone: 'danger' };
    if (separation <= contact * 10) return { label: 'watch', tone: 'warning' };
    return { label: 'low', tone: 'success' };
  }

  return (
    <Panel>
      <PanelHeader
        title="Collision Risk"
        subtitle={`Reference: ${report.selected.name}`}
        icon={<Shield size={14} />}
        actions={
          <StatusBadge tone={collisionsEnabled ? 'warning' : 'neutral'}>
            {collisionsEnabled ? `collisions: ${collisionMode}` : 'collisions off'}
          </StatusBadge>
        }
      />
      <PanelSection title="Candidate pairs" dense>
        {report.candidates.length === 0 ? (
          <p className="text-[10px] leading-relaxed text-(--faint)">No other bodies available for comparison.</p>
        ) : (
          <div role="list" aria-label="Collision candidates" className="space-y-2">
            {report.candidates.map(({ other, separation, relativeSpeed, contact, approach, energy }) => {
              const risk = riskOf(separation, contact);
              return (
                <div
                  key={other.id}
                  role="listitem"
                  className="rounded-[3px] border border-(--line) px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[11px] text-(--ink)">{other.name}</span>
                    <StatusBadge tone={risk.tone} dot>{risk.label}</StatusBadge>
                  </div>
                  <div className="orb-mono mt-1 text-[9px] text-(--faint)">
                    now {formatScientific(separation, 3)} m · contact {formatScientific(contact, 3)} m · Δv{' '}
                    {formatScientific(relativeSpeed, 3)} m/s
                  </div>
                  <div className="orb-mono mt-0.5 text-[9px] text-(--muted)">
                    forecast min {approach ? formatScientific(approach.distance, 3) : '—'} m at +
                    {approach ? formatDuration(approach.time) : '—'} · E {formatScientific(energy, 3)} J
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>
      <PanelSection title="Simulation response" dense>
        <InfoNote title="Sampled forecast" tone="warning">
          Closest approaches come from a short sampled propagation using {integrator} at {formatScientific(timestep, 2)} s
          steps. Overlapping spheres: {report.activeEvents}. Real impacts involve fragmentation and deformation.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
