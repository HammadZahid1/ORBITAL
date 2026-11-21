import { useMemo } from 'react';
import { Atom } from 'lucide-react';
import {
  dopplerShift,
  gravitationalTimeDilationFactor,
  photonSphereRadius,
  relativisticGamma,
  schwarzschildRadius,
} from '../../../engine/analysis/astrophysics';
import { C } from '../../../engine/numeric';
import { formatScientific } from '../../../engine/numeric';
import { bodyIndex, readVec3 } from '../../../engine/physics/world';
import { dot3, length3, scale3, sub3 } from '../../../engine/vector';
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

/** Schwarzschild and special-relativistic teaching estimates from live state. */
export function RelativityPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const body = bodies.find((candidate) => candidate.id === selectedId) ?? null;
    if (!body) return null;
    const world = engine.world;
    const index = bodyIndex(world, body.id);
    const primaryIndex = bodies
      .filter((candidate) => candidate.id !== body.id && Number.isFinite(candidate.physical.mass))
      .reduce<{ id: string; mass: number }>(
        (best, candidate) =>
          candidate.physical.mass > best.mass
            ? { id: candidate.id, mass: candidate.physical.mass }
            : best,
        { id: '', mass: -Infinity },
      );
    const referenceIndex = primaryIndex.id ? bodyIndex(world, primaryIndex.id) : -1;
    const position = index >= 0 ? readVec3(world.pos, index) : body.physical.position;
    const velocity = index >= 0 ? readVec3(world.vel, index) : body.physical.velocity;
    const relativePosition =
      referenceIndex >= 0
        ? sub3(position, readVec3(world.pos, referenceIndex))
        : { x: position.x, y: position.y, z: position.z };
    const relativeVelocity =
      referenceIndex >= 0
        ? sub3(velocity, readVec3(world.vel, referenceIndex))
        : { x: velocity.x, y: velocity.y, z: velocity.z };
    const separation = length3(relativePosition);
    const radialSpeed =
      separation > 0
        ? attempt(() =>
            Math.abs(dot3(relativeVelocity, scale3(relativePosition, 1 / separation))),
          )
        : 0;
    const speed = length3(velocity);
    const mass = body.physical.mass;
    const radius = body.physical.radius;
    return {
      body,
      speed,
      radialSpeed,
      horizon: attempt(() => schwarzschildRadius(mass)),
      photon: attempt(() => photonSphereRadius(mass)),
      dilation: attempt(() => gravitationalTimeDilationFactor(mass, radius)),
      gamma: attempt(() => relativisticGamma(speed)),
      beta: Number.isFinite(speed) ? speed / C : null,
      radialBeta: radialSpeed !== null && Number.isFinite(radialSpeed) ? radialSpeed / C : null,
      doppler: attempt(() =>
        dopplerShift(1e12, Math.min((radialSpeed ?? 0) / C, 0.999999), true),
      ),
    };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Relativity Estimates" icon={<Atom size={14} />} />
        <EmptyState
          title="No body selected"
          description="Select a body to inspect relativistic scales and its Lorentz factor."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const compactness =
    report.horizon !== null && report.body.physical.radius > 0
      ? report.horizon / report.body.physical.radius
      : null;
  const outsideHorizon = compactness !== null && compactness < 1;

  return (
    <Panel>
      <PanelHeader
        title="Relativity Estimates"
        subtitle={report.body.name}
        icon={<Atom size={14} />}
        actions={
          <StatusBadge tone={outsideHorizon ? 'accent' : 'danger'}>
            {outsideHorizon ? 'outside horizon' : 'inside horizon model'}
          </StatusBadge>
        }
      />
      <PanelSection title="Compact-object scales" dense>
        <StatGrid
          label="Relativistic scales"
          items={[
            { id: 'horizon', label: 'Schwarzschild radius', value: fmt(report.horizon, 3), unit: 'm' },
            { id: 'photon', label: 'Photon sphere', value: fmt(report.photon, 3), unit: 'm' },
            { id: 'dilation', label: 'Time dilation', value: fmt(report.dilation, 6) },
            { id: 'gamma', label: 'Lorentz factor', value: fmt(report.gamma, 6) },
          ]}
        />
      </PanelSection>
      <PanelSection title="Kinematics" dense>
        <KeyValueList
          label="Relativistic kinematics"
          items={[
            { label: 'Speed / c', value: fmt(report.beta, 6), mono: true },
            { label: 'Radial β', value: fmt(report.radialBeta, 6), mono: true },
            { label: 'Horizon / radius', value: fmt(compactness, 6), mono: true },
            { label: 'Doppler @ 1 THz', value: `${fmt(report.doppler, 6)} Hz`, mono: true },
          ]}
        />
      </PanelSection>
      <PanelSection title="Model note" dense>
        <InfoNote title="Idealised formulas" tone="warning">
          Schwarzschild radii and static-observer dilation use a non-rotating, uncharged point mass. The solver itself
          stays Newtonian; no gravitational-wave or horizon physics is integrated.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
