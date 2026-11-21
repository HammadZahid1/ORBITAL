import { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { gravitationalPotential } from '../../../engine/analysis/astrophysics';
import { formatScientific } from '../../../engine/numeric';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  StatusBadge,
} from '../../ui/extra';

interface Ring {
  factor: number;
  radius: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  cells: number[];
}

const SAMPLES = 12;
const FACTORS = [0.25, 0.5, 1, 2, 4];

function potentialAt(
  x: number,
  z: number,
  ids: string[],
  masses: Float64Array,
  positions: Float64Array,
  softening: number,
): number | null {
  let total = 0;
  let valid = false;
  const floor = Number.isFinite(softening) && softening > 0 ? softening : 1;
  for (let i = 0; i < ids.length; i += 1) {
    const mu = engine.world.G * masses[i];
    if (!Number.isFinite(mu) || mu <= 0) continue;
    const dx = x - positions[i * 3];
    const dz = z - positions[i * 3 + 2];
    const distance = Math.max(Math.hypot(dx, dz), floor);
    if (!Number.isFinite(distance) || distance <= 0) continue;
    try {
      const value = gravitationalPotential(mu, distance);
      total += value;
      valid = true;
    } catch {
      // Skip singular samples rather than propagating non-finite values.
    }
  }
  return valid && Number.isFinite(total) ? total : null;
}

/** Textual/2-D CSS summary of the gravitational potential field (no WebGL). */
export function GravitationalPotentialPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const world = engine.world;
    const indices = Array.from({ length: world.count }, (_, index) => index).filter(
      (index) =>
        Number.isFinite(world.mass[index]) &&
        world.mass[index] > 0 &&
        Number.isFinite(world.pos[index * 3]) &&
        Number.isFinite(world.pos[index * 3 + 2]),
    );
    if (indices.length === 0) return null;
    const primary = indices.reduce((best, index) => (world.mass[index] > world.mass[best] ? index : best), indices[0]);
    const reference = indices
      .map((index) => Math.hypot(world.pos[index * 3] - world.pos[primary * 3], world.pos[index * 3 + 2] - world.pos[primary * 3 + 2]))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);
    const baseRadius = reference > 0 ? reference : Math.max(world.radius[primary] * 100, 1);
    const ids = world.ids.slice(0, world.count);
    const rings: Ring[] = FACTORS.map((factor) => {
      const radius = baseRadius * factor;
      const cells: number[] = [];
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const angle = (sample / SAMPLES) * Math.PI * 2;
        const value = potentialAt(
          world.pos[primary * 3] + radius * Math.cos(angle),
          world.pos[primary * 3 + 2] + radius * Math.sin(angle),
          ids,
          world.mass,
          world.pos,
          world.softening,
        );
        cells.push(value ?? NaN);
      }
      const finite = cells.filter(Number.isFinite);
      return {
        factor,
        radius,
        cells,
        min: finite.length > 0 ? Math.min(...finite) : null,
        max: finite.length > 0 ? Math.max(...finite) : null,
        mean: finite.length > 0 ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null,
      };
    });
    const referenceRing = rings.find((ring) => ring.factor === 1) ?? rings[0];
    const selectedIndex = selectedId ? world.ids.indexOf(selectedId) : -1;
    const selectedPotential =
      selectedIndex >= 0
        ? potentialAt(
            world.pos[selectedIndex * 3],
            world.pos[selectedIndex * 3 + 2],
            ids,
            world.mass,
            world.pos,
            world.softening,
          )
        : null;
    const depths = rings.map((ring) => ring.min).filter((value): value is number => value !== null);
    return {
      primaryName: ids[primary] ?? 'primary',
      baseRadius,
      rings,
      referenceRing,
      deepest: depths.length > 0 ? Math.min(...depths) : null,
      selectedPotential,
      softening: world.softening,
    };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Potential Field Map" icon={<LayoutGrid size={14} />} />
        <EmptyState
          title="No potential field"
          description="The universe needs at least one massive body to sample a gravitational potential."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const span = Math.max(
    1e-30,
    Math.abs(report.deepest ?? -1) + Math.abs(report.referenceRing.max ?? 0),
  );

  return (
    <Panel>
      <PanelHeader
        title="Potential Field Map"
        subtitle={`Sampled in the orbital plane about ${report.primaryName}`}
        icon={<LayoutGrid size={14} />}
        actions={<StatusBadge tone="accent">2-D summary</StatusBadge>}
      />
      <PanelSection title="Potential grid" dense>
        <div className="space-y-2">
          {report.rings.map((ring) => (
            <div key={ring.factor}>
              <div className="orb-mono mb-1 flex justify-between text-[9px] text-(--faint)">
                <span>{ring.factor}× reference radius</span>
                <span>{formatScientific(ring.radius, 2)} m</span>
              </div>
              <div
                role="img"
                aria-label={`Ring ${ring.factor} times reference radius, mean potential ${fmt(ring.mean, 3)} joules per kilogram`}
                className="grid grid-cols-12 gap-0.5"
              >
                {ring.cells.map((value, index) => {
                  const strength = Number.isFinite(value) ? Math.min(1, Math.abs(value) / span) : 0;
                  return (
                    <span
                      key={index}
                      aria-hidden="true"
                      className="h-3 rounded-[2px] border border-(--line-soft)"
                      style={{ backgroundColor: `rgba(62, 168, 255, ${(0.08 + strength * 0.82).toFixed(3)})` }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Field summary" dense>
        <KeyValueList
          label="Potential summary"
          items={[
            { label: 'Dominant body', value: report.primaryName },
            { label: 'Reference radius', value: `${fmt(report.baseRadius, 3)} m`, mono: true },
            { label: 'Deepest sample', value: `${fmt(report.deepest, 3)} J/kg`, mono: true },
            { label: 'Mean at 1×', value: `${fmt(report.referenceRing.mean, 3)} J/kg`, mono: true },
            { label: 'Selected potential', value: `${fmt(report.selectedPotential, 3)} J/kg`, mono: true },
            { label: 'Softening floor', value: `${fmt(report.softening, 3)} m`, mono: true },
          ]}
        />
      </PanelSection>
      <PanelSection title="Reading the map" dense>
        <InfoNote title="Negative potential wells" tone="info">
          Each cell samples Φ = −Σμ/r in the X–Z plane with a softening floor. Brighter cells are deeper wells; this
          is a coarse teaching summary, not a rendered field or an equipotential solution.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
