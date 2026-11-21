import { useMemo } from 'react';
import { Star } from 'lucide-react';
import {
  habitableZoneInnerRadius,
  habitableZoneOuterRadius,
  schwarzschildRadius,
} from '../../../engine/analysis/astrophysics';
import { AU, SOLAR_MASS } from '../../../engine/numeric';
import { formatScientific } from '../../../engine/numeric';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  MetricCard,
  StatusBadge,
} from '../../ui/extra';

const SOLAR_LUMINOSITY = 3.828e26;
const SOLAR_RADIUS = 6.957e8;
const STEFAN_BOLTZMANN = 5.670374419e-8;

function attempt<T>(fn: () => T): T | null {
  try {
    const value = fn();
    return typeof value === 'number' && !Number.isFinite(value) ? null : value;
  } catch {
    return null;
  }
}

function estimateLuminosity(mass: number): number | null {
  return attempt(() => {
    const ratio = mass / SOLAR_MASS;
    if (ratio < 0.08 || ratio > 20) throw new RangeError('outside main-sequence proxy range');
    return SOLAR_LUMINOSITY * ratio ** 3.5;
  });
}

function spectralProxy(mass: number): string {
  if (!Number.isFinite(mass) || mass <= 0) return '—';
  const ratio = mass / SOLAR_MASS;
  if (ratio < 0.08) return 'sub-stellar';
  if (ratio < 0.45) return 'M (red dwarf)';
  if (ratio < 0.8) return 'K (orange dwarf)';
  if (ratio < 1.05) return 'G (Sun-like)';
  if (ratio < 1.4) return 'F (yellow-white)';
  if (ratio < 2.1) return 'A (white)';
  if (ratio < 16) return 'B (blue-white)';
  return 'O (blue giant)';
}

/** Stellar mass/radius diagnostics with a main-sequence luminosity proxy. */
export function StellarPropertiesPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const selected = bodies.find((body) => body.id === selectedId);
    const star =
      selected?.type === 'star'
        ? selected
        : (bodies.find((body) => body.type === 'star') ?? null);
    if (!star) return null;
    const mass = star.physical.mass;
    const radius = star.physical.radius;
    if (!Number.isFinite(mass) || !Number.isFinite(radius) || mass <= 0 || radius <= 0) {
      return { star, invalid: true as const };
    }
    void engine.world;
    const luminosity = estimateLuminosity(mass);
    const temperature = attempt(() =>
      luminosity === null
        ? NaN
        : Math.pow(luminosity / (4 * Math.PI * radius * radius * STEFAN_BOLTZMANN), 0.25),
    );
    return {
      star,
      invalid: false as const,
      luminosity,
      temperature,
      horizon: attempt(() => schwarzschildRadius(mass)),
      inner: attempt(() => (luminosity === null ? NaN : habitableZoneInnerRadius(luminosity))),
      outer: attempt(() => (luminosity === null ? NaN : habitableZoneOuterRadius(luminosity))),
      index: engine.world.ids.indexOf(star.id),
    };
    // Frame is a mutable-world invalidation signal, matching the other engine-backed panels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Stellar Properties" icon={<Star size={14} />} />
        <EmptyState
          title="No star available"
          description="Add a star to the universe to estimate its luminosity and habitable zone."
        />
      </Panel>
    );
  }

  const { star } = report;
  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const massRatio = report.invalid ? null : star.physical.mass / SOLAR_MASS;
  const radiusRatio = report.invalid ? null : star.physical.radius / SOLAR_RADIUS;
  const compactness = report.invalid || report.horizon === null ? null : report.horizon / star.physical.radius;

  return (
    <Panel>
      <PanelHeader
        title="Stellar Properties"
        subtitle={selectedId !== star.id ? `Showing ${star.name} (no star selected)` : star.name}
        icon={<Star size={14} />}
        actions={<StatusBadge tone="accent">main-sequence proxy</StatusBadge>}
      />
      <PanelSection title="Derived quantities" dense>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Mass"
            value={fmt(massRatio, 2)}
            unit="M☉"
            detail={`${formatScientific(star.physical.mass, 3)} kg`}
          />
          <MetricCard
            label="Radius"
            value={fmt(radiusRatio, 2)}
            unit="R☉"
            detail={`${formatScientific(star.physical.radius, 3)} m`}
          />
          <MetricCard
            label="Est. luminosity"
            value={fmt(report.invalid ? null : report.luminosity, 3)}
            unit="L☉"
            detail="M³·⁵ scaling"
          />
          <MetricCard
            label="Effective temperature"
            value={fmt(report.invalid ? null : report.temperature, 0)}
            unit="K"
            detail="blackbody estimate"
          />
        </div>
      </PanelSection>
      <PanelSection title="Reference scales" dense>
        <KeyValueList
          label="Stellar reference scales"
          items={[
            { label: 'Spectral proxy', value: report.invalid ? '—' : spectralProxy(star.physical.mass) },
            {
              label: 'Habitable zone',
              value:
                report.invalid || report.inner === null || report.outer === null
                  ? '—'
                  : `${fmt(report.inner / AU, 2)}–${fmt(report.outer / AU, 2)} AU`,
              mono: true,
            },
            { label: 'Schwarzschild radius', value: `${fmt(report.invalid ? null : report.horizon, 3)} m`, mono: true },
            { label: 'Horizon / radius', value: fmt(compactness, 4), mono: true },
            { label: 'World index', value: report.index !== undefined && report.index >= 0 ? report.index : '—', mono: true },
          ]}
        />
      </PanelSection>
      <PanelSection title="Model note" dense>
        <InfoNote title="Educational estimate" tone="info">
          Luminosity follows a main-sequence mass–luminosity relation and temperature follows a grey-body law.
          Giants, pre-main-sequence objects and black holes are outside its validity.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
