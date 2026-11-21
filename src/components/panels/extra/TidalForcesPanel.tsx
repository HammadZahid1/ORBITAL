import { useMemo } from 'react';
import { Waves } from 'lucide-react';
import {
  hillRadiusFromMassRatio,
  rocheLimitRigid,
  sphereOfInfluenceRadius,
  surfaceGravityAtAltitude,
  tidalAcceleration,
} from '../../../engine/analysis/astrophysics';
import { formatScientific } from '../../../engine/numeric';
import { bodyIndex } from '../../../engine/physics/world';
import { length3, sub3 } from '../../../engine/vector';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  StatGrid,
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

function densityOf(mass: number, radius: number): number | null {
  return attempt(() => {
    const density = mass / ((4 / 3) * Math.PI * radius ** 3);
    if (!Number.isFinite(density) || density <= 0) throw new RangeError('invalid density');
    return density;
  });
}

/** Weak-field tidal, Roche and sphere-of-influence estimates for a pair of bodies. */
export function TidalForcesPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const target = bodies.find((body) => body.id === selectedId) ?? null;
    if (!target) return null;
    const parent = target.parentId ? (bodies.find((body) => body.id === target.parentId) ?? null) : null;
    const source =
      parent && parent.id !== target.id
        ? parent
        : (bodies
            .filter((body) => body.id !== target.id && Number.isFinite(body.physical.mass))
            .sort((a, b) => b.physical.mass - a.physical.mass)[0] ?? null);
    if (!source) return { target, source: null };

    const world = engine.world;
    const targetIndex = bodyIndex(world, target.id);
    const sourceIndex = bodyIndex(world, source.id);
    const separation =
      targetIndex >= 0 && sourceIndex >= 0
        ? length3(
            sub3(
              { x: world.pos[targetIndex * 3], y: world.pos[targetIndex * 3 + 1], z: world.pos[targetIndex * 3 + 2] },
              { x: world.pos[sourceIndex * 3], y: world.pos[sourceIndex * 3 + 1], z: world.pos[sourceIndex * 3 + 2] },
            ),
          )
        : NaN;
    const mu = world.G * source.physical.mass;
    const targetDensity = densityOf(target.physical.mass, target.physical.radius);
    const sourceDensity = densityOf(source.physical.mass, source.physical.radius);
    const massRatio = attempt(() => {
      const total = source.physical.mass + target.physical.mass;
      const ratio = target.physical.mass / total;
      if (!Number.isFinite(ratio) || ratio > 0.5) throw new RangeError('primary is not the heavier body');
      return ratio;
    });
    const tidal = attempt(() => tidalAcceleration(mu, target.physical.radius, separation));
    const selfGravity = attempt(() => surfaceGravityAtAltitude(target.physical.mass, target.physical.radius, 0));
    const roche =
      sourceDensity !== null && targetDensity !== null
        ? attempt(() => rocheLimitRigid(source.physical.radius, sourceDensity, targetDensity))
        : null;
    return {
      target,
      source,
      separation,
      tidal,
      selfGravity,
      ratio: tidal !== null && selfGravity !== null && selfGravity > 0 ? tidal / selfGravity : null,
      roche,
      hill: massRatio === null ? null : attempt(() => hillRadiusFromMassRatio(separation, massRatio)),
      soi: attempt(() => sphereOfInfluenceRadius(separation, target.physical.mass, source.physical.mass)),
      targetDensity,
      sourceDensity,
    };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report || !report.source) {
    return (
      <Panel>
        <PanelHeader title="Tidal Forces" icon={<Waves size={14} />} />
        <EmptyState
          title="No tidal pair available"
          description="Select a body with another body in the scene to compare tidal and self-gravity."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const insideRoche = report.roche !== null && Number.isFinite(report.separation) && report.separation < report.roche;

  return (
    <Panel>
      <PanelHeader
        title="Tidal Forces"
        subtitle={`${report.target.name} perturbed by ${report.source.name}`}
        icon={<Waves size={14} />}
        actions={
          <StatusBadge tone={insideRoche ? 'danger' : 'success'} dot>
            {insideRoche ? 'inside Roche limit' : 'outside Roche limit'}
          </StatusBadge>
        }
      />
      <PanelSection title="Tidal scales" dense>
        <StatGrid
          label="Tidal scales"
          items={[
            { id: 'tidal', label: 'Tidal acceleration', value: fmt(report.tidal, 3), unit: 'm/s²' },
            { id: 'ratio', label: 'Tidal / self-gravity', value: fmt(report.ratio, 4) },
            { id: 'roche', label: 'Rigid Roche limit', value: fmt(report.roche, 3), unit: 'm' },
            { id: 'hill', label: 'Hill radius', value: fmt(report.hill, 3), unit: 'm' },
          ]}
        />
      </PanelSection>
      <PanelSection title="Pair details" dense>
        <KeyValueList
          label="Tidal pair details"
          items={[
            { label: 'Separation', value: `${fmt(Number.isFinite(report.separation) ? report.separation : null, 3)} m`, mono: true },
            { label: 'Sphere of influence', value: `${fmt(report.soi, 3)} m`, mono: true },
            { label: 'Target density', value: `${fmt(report.targetDensity, 1)} kg/m³`, mono: true },
            { label: 'Source density', value: `${fmt(report.sourceDensity, 1)} kg/m³`, mono: true },
            { label: 'Surface gravity', value: `${fmt(report.selfGravity, 3)} m/s²`, mono: true },
          ]}
        />
      </PanelSection>
      <PanelSection title="Model note" dense>
        <InfoNote title="Linearised, weak field" tone="info">
          a_tidal ≈ 2μR/r³ uses a point-mass source and a small rigid target. It ignores deformation, spin,
          material strength and higher-order terms near the Roche limit.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
