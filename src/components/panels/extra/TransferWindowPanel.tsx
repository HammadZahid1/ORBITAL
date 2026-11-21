import { useMemo, useState } from 'react';
import { Rocket } from 'lucide-react';
import {
  orbitalPeriodFromSemiMajorAxis,
  synodicPeriod,
} from '../../../engine/analysis/astrophysics';
import { formatDuration, formatScientific } from '../../../engine/numeric';
import { calculateOrbitalElements } from '../../../engine/orbits/orbital';
import { hohmannTransfer } from '../../../engine/orbits/transfer';
import { bodyIndex } from '../../../engine/physics/world';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  SelectField,
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

function wrapAngle(angle: number): number {
  return ((((angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** Two-body launch-window estimates for a departure and target orbit. */
export function TransferWindowPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const [targetId, setTargetId] = useState('');

  const departure = bodies.find((body) => body.id === selectedId) ?? null;
  const candidates = departure
    ? bodies.filter((body) => body.id !== departure.id && body.parentId === departure.parentId && body.parentId)
    : [];

  const report = useMemo(() => {
    if (!departure || candidates.length === 0) return null;
    const target = candidates.find((body) => body.id === targetId) ?? candidates[0];
    const world = engine.world;
    const departureIndex = bodyIndex(world, departure.id);
    const targetIndex = bodyIndex(world, target.id);
    const parentIndex = departure.parentId ? bodyIndex(world, departure.parentId) : -1;
    if (departureIndex < 0 || targetIndex < 0 || parentIndex < 0) return { target, invalid: true as const };
    const elementsA = calculateOrbitalElements(world, departureIndex, parentIndex);
    const elementsB = calculateOrbitalElements(world, targetIndex, parentIndex);
    if (!elementsA || !elementsB || !elementsA.isBound || !elementsB.isBound) {
      return { target, invalid: true as const };
    }
    const a1 = elementsA.semiMajorAxis;
    const a2 = elementsB.semiMajorAxis;
    const periodA = attempt(() => orbitalPeriodFromSemiMajorAxis(a1, elementsA.mu));
    const periodB = attempt(() => orbitalPeriodFromSemiMajorAxis(a2, elementsA.mu));
    const synodic = periodA !== null && periodB !== null ? attempt(() => synodicPeriod(periodA, periodB)) : null;
    const transfer = hohmannTransfer(elementsA.mu, a1, a2);
    if (!transfer || periodA === null || periodB === null || synodic === null) {
      return { target, invalid: true as const };
    }
    const angleOf = (index: number): number => {
      const x = world.pos[index * 3] - world.pos[parentIndex * 3];
      const z = world.pos[index * 3 + 2] - world.pos[parentIndex * 3 + 2];
      return Math.atan2(z, x);
    };
    const currentPhase = angleOf(departureIndex) - angleOf(targetIndex);
    const requiredPhase = Math.PI - ((2 * Math.PI) / periodB) * transfer.transferTime;
    const phaseError = wrapAngle(requiredPhase - currentPhase);
    const waitTime = (wrapAngle(requiredPhase - currentPhase) / (2 * Math.PI)) * synodic;
    return {
      target,
      invalid: false as const,
      periodA,
      periodB,
      synodic,
      transfer,
      currentPhase,
      requiredPhase,
      phaseError,
      waitTime,
    };
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, candidates, departure, frame, targetId]);

  if (!departure) {
    return (
      <Panel>
        <PanelHeader title="Transfer Window" icon={<Rocket size={14} />} />
        <EmptyState
          title="No departure body"
          description="Select an orbiting body to compute its transfer geometry and synodic window."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const degrees = (value: number | null) =>
    value === null ? '—' : `${formatScientific((value * 180) / Math.PI, 1)}°`;
  const aligned =
    report && !report.invalid && Math.abs(report.phaseError) < (5 * Math.PI) / 180;

  return (
    <Panel>
      <PanelHeader
        title="Transfer Window"
        subtitle={`Departing ${departure.name}`}
        icon={<Rocket size={14} />}
        actions={<StatusBadge tone={aligned ? 'success' : 'warning'}>{aligned ? 'window open' : 'wait for phase'}</StatusBadge>}
      />
      <PanelSection title="Target orbit" dense>
        <SelectField
          label="Target body"
          value={report?.target.id ?? ''}
          options={candidates.map((body) => ({ value: body.id, label: body.name }))}
          onChange={setTargetId}
          disabled={candidates.length === 0}
          hint="Bodies sharing the departure body's primary."
        />
      </PanelSection>
      {!report || report.invalid ? (
        <PanelSection title="No solution" dense>
          <InfoNote title="Need two bound sibling orbits" tone="info">
            Select a bound orbiter with at least one sibling around the same primary. Equal-period orbits do not
            define a finite synodic window.
          </InfoNote>
        </PanelSection>
      ) : (
        <>
          <PanelSection title="Window estimate" dense>
            <StatGrid
              label="Transfer window"
              items={[
                { id: 'departure', label: 'Departure period', value: formatDuration(report.periodA) },
                { id: 'synodic', label: 'Synodic period', value: formatDuration(report.synodic) },
                { id: 'transfer', label: 'Transfer time', value: formatDuration(report.transfer.transferTime) },
                { id: 'dv', label: 'Total Δv', value: fmt(report.transfer.totalDeltaV, 3), unit: 'm/s' },
              ]}
            />
          </PanelSection>
          <PanelSection title="Phasing" dense>
            <KeyValueList
              label="Transfer phasing"
              items={[
                { label: 'Current phase', value: degrees(report.currentPhase), mono: true },
                { label: 'Required phase', value: degrees(report.requiredPhase), mono: true },
                { label: 'Phase error', value: degrees(report.phaseError), mono: true },
                { label: 'Next window in', value: formatDuration(Math.max(0, report.waitTime)), mono: true },
                { label: 'Departure burn', value: `${fmt(report.transfer.departureBurn, 3)} m/s`, mono: true },
                { label: 'Arrival burn', value: `${fmt(report.transfer.arrivalBurn, 3)} m/s`, mono: true },
              ]}
            />
            <div className="mt-3">
              <InfoNote title="Circular coplanar assumption" tone="info">
                The Hohmann model ignores plane changes, eccentricity, finite burn time and perturbations from other
                bodies. Treat phase angles as teaching estimates, not a flight plan.
              </InfoNote>
            </div>
          </PanelSection>
        </>
      )}
    </Panel>
  );
}
