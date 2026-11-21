import { useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  escapeSpeedAtAltitude,
  surfaceGravityAtAltitude,
} from '../../../engine/analysis/astrophysics';
import { formatScientific } from '../../../engine/numeric';
import { bodyIndex } from '../../../engine/physics/world';
import { length3 } from '../../../engine/vector';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { useUIStore } from '../../../state/uiStore';
import type { CelestialBody } from '../../../types/celestial';
import { Button, Panel, PanelHeader, PanelSection } from '../../ui';
import {
  CollapsibleSection,
  EmptyState,
  InfoNote,
  KeyValueList,
  StatusBadge,
} from '../../ui/extra';

function attempt<T>(fn: () => T): T | null {
  try {
    const value = fn();
    return typeof value === 'number' && !Number.isFinite(value) ? null : value;
  } catch {
    return null;
  }
}

function metricsFor(body: CelestialBody) {
  const { mass, radius } = body.physical;
  const world = engine.world;
  const index = bodyIndex(world, body.id);
  return {
    mass,
    radius,
    speed: index >= 0 ? length3({ x: world.vel[index * 3], y: world.vel[index * 3 + 1], z: world.vel[index * 3 + 2] }) : NaN,
    density: attempt(() => mass / ((4 / 3) * Math.PI * radius ** 3)),
    gravity: attempt(() => surfaceGravityAtAltitude(mass, radius, 0)),
    escape: attempt(() => escapeSpeedAtAltitude(mass, radius, 0)),
  };
}

/** Side-by-side physical metrics for the UI comparison set. */
export function BodyComparisonPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const comparisonIds = useUIStore((state) => state.comparisonIds);
  const toggleComparison = useUIStore((state) => state.toggleComparison);

  const selected = bodies.find((body) => body.id === selectedId) ?? null;
  const compared = useMemo(() => {
    const flagged = comparisonIds
      .map((id) => bodies.find((body) => body.id === id))
      .filter((body): body is CelestialBody => Boolean(body));
    const fallback = [selected, ...bodies.filter((body) => body.id !== selected?.id)].filter(
      (body): body is CelestialBody => Boolean(body),
    );
    return (flagged.length > 0 ? flagged : fallback).slice(0, 4);
  }, [bodies, comparisonIds, selected]);

  const rows = useMemo(
    () => compared.map((body) => ({ body, metrics: metricsFor(body) })),
    // Mutable world values are refreshed when the frame counter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compared, frame],
  );

  if (rows.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Body Comparison" icon={<ArrowLeftRight size={14} />} />
        <EmptyState title="Nothing to compare" description="Add bodies to the universe or select one to compare." />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const reference = rows[0].metrics;
  const ratio = (value: number | null, base: number | null) =>
    value !== null && base !== null && base !== 0 ? fmt(value / base, 3) : '—';
  const isFlagged = Boolean(selected && comparisonIds.includes(selected.id));

  return (
    <Panel>
      <PanelHeader
        title="Body Comparison"
        subtitle={`${rows.length} bodies in comparison set`}
        icon={<ArrowLeftRight size={14} />}
        actions={<StatusBadge tone="accent">live state</StatusBadge>}
      />
      <PanelSection title="Comparison set" dense>
        {selected && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => toggleComparison(selected.id)}
          >
            {isFlagged ? `Remove ${selected.name} from comparison` : `Add ${selected.name} to comparison`}
          </Button>
        )}
        <div className="mt-2 space-y-2">
          {rows.map(({ body, metrics }, index) => (
            <CollapsibleSection
              key={body.id}
              title={`${body.name} · ${body.type}`}
              defaultOpen={index === 0}
              description={`Reference: ${rows[0].body.name}`}
            >
              <KeyValueList
                label={`${body.name} metrics`}
                items={[
                  { label: 'Mass', value: `${fmt(metrics.mass, 3)} kg`, mono: true },
                  { label: 'Radius', value: `${fmt(metrics.radius, 3)} m`, mono: true },
                  { label: 'Density', value: `${fmt(metrics.density, 2)} kg/m³`, mono: true },
                  { label: 'Surface gravity', value: `${fmt(metrics.gravity, 3)} m/s²`, mono: true },
                  { label: 'Escape speed', value: `${fmt(metrics.escape, 3)} m/s`, mono: true },
                  { label: 'World speed', value: `${fmt(Number.isFinite(metrics.speed) ? metrics.speed : null, 3)} m/s`, mono: true },
                  { label: 'Mass / reference', value: ratio(metrics.mass, reference.mass), mono: true },
                  { label: 'Radius / reference', value: ratio(metrics.radius, reference.radius), mono: true },
                  { label: 'Gravity / reference', value: ratio(metrics.gravity, reference.gravity), mono: true },
                ]}
              />
            </CollapsibleSection>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Measurement note" dense>
        <InfoNote title="Instantaneous comparison" tone="info">
          Densities assume spherical bodies; gravity and escape speed use unsoftened point-mass formulae. Speeds are
          read from the live solver state.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
