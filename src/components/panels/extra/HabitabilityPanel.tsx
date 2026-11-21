import { useMemo } from 'react';
import { Sun } from 'lucide-react';
import {
  habitableZoneInnerRadius,
  habitableZoneOuterRadius,
} from '../../../engine/analysis/astrophysics';
import { AU, SOLAR_MASS } from '../../../engine/numeric';
import { formatScientific } from '../../../engine/numeric';
import { length3, sub3 } from '../../../engine/vector';
import { bodyIndex } from '../../../engine/physics/world';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  ProgressMeter,
  StatusBadge,
} from '../../ui/extra';

const SOLAR_LUMINOSITY = 3.828e26;

function attempt<T>(fn: () => T): T | null {
  try {
    const value = fn();
    return typeof value === 'number' && !Number.isFinite(value) ? null : value;
  } catch {
    return null;
  }
}

function fluxAt(orbitRadius: number, luminosity: number): number | null {
  return attempt(() => {
    if (orbitRadius <= 0) throw new RangeError('orbit radius must be positive');
    return luminosity / SOLAR_LUMINOSITY / (orbitRadius / AU) ** 2;
  });
}

/** Conservative habitable-zone placement for the selected orbiter. */
export function HabitabilityPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const selected = bodies.find((body) => body.id === selectedId) ?? null;
    const star =
      selected?.type === 'star'
        ? selected
        : (bodies.find((body) => body.type === 'star') ?? null);
    if (!star) return null;
    const orbiter =
      selected && selected.id !== star.id && selected.type !== 'blackhole' && selected.parentId === star.id
        ? selected
        : (bodies.find((body) => body.parentId === star.id && body.type !== 'blackhole') ?? null);
    const world = engine.world;
    const starIndex = bodyIndex(world, star.id);
    const bodyIndexValue = orbiter ? bodyIndex(world, orbiter.id) : -1;
    const mass = star.physical.mass;
    const separation =
      orbiter && starIndex >= 0 && bodyIndexValue >= 0
        ? length3(
            sub3(
              { x: world.pos[bodyIndexValue * 3], y: world.pos[bodyIndexValue * 3 + 1], z: world.pos[bodyIndexValue * 3 + 2] },
              { x: world.pos[starIndex * 3], y: world.pos[starIndex * 3 + 1], z: world.pos[starIndex * 3 + 2] },
            ),
          )
        : NaN;
    const luminosity = attempt(() => {
      const ratio = mass / SOLAR_MASS;
      if (!Number.isFinite(ratio) || ratio < 0.08 || ratio > 20) throw new RangeError('unsupported mass');
      return SOLAR_LUMINOSITY * ratio ** 3.5;
    });
    const inner = attempt(() => (luminosity === null ? NaN : habitableZoneInnerRadius(luminosity)));
    const outer = attempt(() => (luminosity === null ? NaN : habitableZoneOuterRadius(luminosity)));
    const flux = luminosity !== null && Number.isFinite(separation) ? fluxAt(separation, luminosity) : null;
    return { star, orbiter, separation, luminosity, inner, outer, flux };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Habitability Estimate" icon={<Sun size={14} />} />
        <EmptyState
          title="No host star available"
          description="The conservative habitable zone needs a star and an orbiting body."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const { orbiter, inner, outer, flux, separation } = report;
  const inZone = orbiter && inner !== null && outer !== null && separation >= inner && separation <= outer;
  const status =
    !orbiter || !Number.isFinite(separation)
      ? { label: 'No orbit', tone: 'neutral' as const }
      : inZone
        ? { label: 'Conservative HZ', tone: 'success' as const }
        : separation < (inner ?? Infinity)
          ? { label: 'Inside inner edge', tone: 'danger' as const }
          : { label: 'Beyond outer edge', tone: 'warning' as const };

  return (
    <Panel>
      <PanelHeader
        title="Habitability Estimate"
        subtitle={orbiter ? `${orbiter.name} around ${report.star.name}` : `No orbiter found around ${report.star.name}`}
        icon={<Sun size={14} />}
        actions={<StatusBadge tone={status.tone} dot>{status.label}</StatusBadge>}
      />
      <PanelSection title="Insolation" dense>
        <ProgressMeter
          label="Flux relative to Earth"
          value={flux ?? 0}
          min={0}
          max={2}
          valueText={flux === null ? '—' : `${fmt(flux, 2)} S⊕`}
          tone={status.tone === 'neutral' ? 'accent' : status.tone}
        />
        <div className="mt-3">
          <KeyValueList
            label="Habitability figures"
            items={[
              { label: 'Orbital radius', value: orbiter ? `${fmt(separation / AU, 4)} AU` : '—', mono: true },
              { label: 'Inner edge', value: inner === null ? '—' : `${fmt(inner / AU, 3)} AU`, mono: true },
              { label: 'Outer edge', value: outer === null ? '—' : `${fmt(outer / AU, 3)} AU`, mono: true },
              {
                label: 'Margin from inner',
                value: orbiter && inner !== null ? `${fmt((separation - inner) / AU, 3)} AU` : '—',
                mono: true,
              },
              {
                label: 'Margin from outer',
                value: orbiter && outer !== null ? `${fmt((outer - separation) / AU, 3)} AU` : '—',
                mono: true,
              },
            ]}
          />
        </div>
      </PanelSection>
      <PanelSection title="Interpretation" dense>
        <InfoNote title="Flux thresholds only" tone="info">
          Edges use 1.1 and 0.36 times present solar flux. Atmosphere, albedo, eccentricity and stellar spectra are
          not modelled, so a position inside the zone is not a claim of habitability.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
