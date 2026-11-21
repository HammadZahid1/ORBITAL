import { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import {
  craterScalingEstimate,
  escapeSpeedAtAltitude,
  impactKineticEnergy,
  surfaceGravityAtAltitude,
} from '../../../engine/analysis/astrophysics';
import { formatScientific } from '../../../engine/numeric';
import { useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  InfoNote,
  KeyValueList,
  NumberField,
  StatGrid,
  StatusBadge,
  EmptyState,
} from '../../ui/extra';

const MEGATON_TNT = 4.184e15;

function attempt<T>(fn: () => T): T | null {
  try {
    const value = fn();
    return typeof value === 'number' && !Number.isFinite(value) ? null : value;
  } catch {
    return null;
  }
}

/** Classical impact-energy and order-of-magnitude crater estimate. */
export function ImpactEnergyPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const [impactorMass, setImpactorMass] = useState(1e6);
  const [speedKmS, setSpeedKmS] = useState(20);
  const [targetDensity, setTargetDensity] = useState(3000);

  const target = useMemo(
    () => bodies.find((body) => body.id === selectedId) ?? null,
    [bodies, selectedId],
  );

  const report = useMemo(() => {
    if (!target) return null;
    const { mass, radius } = target.physical;
    const speed = speedKmS * 1000;
    return {
      gravity: attempt(() => surfaceGravityAtAltitude(mass, radius, 0)),
      escape: attempt(() => escapeSpeedAtAltitude(mass, radius, 0)),
      energy: attempt(() => impactKineticEnergy(impactorMass, speed)),
      crater: attempt(() => craterScalingEstimate(impactorMass, speed, targetDensity, gravityValue(mass, radius))),
    };
  }, [target, impactorMass, speedKmS, targetDensity]);

  if (!target || !report) {
    return (
      <Panel>
        <PanelHeader title="Impact Energy" icon={<Zap size={14} />} />
        <EmptyState
          title="No target selected"
          description="Select a body to estimate impact energy and crater scale."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const tnt = report.energy === null ? null : report.energy / MEGATON_TNT;
  const hypervelocity = report.escape !== null && speedKmS * 1000 > report.escape;

  return (
    <Panel>
      <PanelHeader
        title="Impact Energy"
        subtitle={`Target: ${target.name}`}
        icon={<Zap size={14} />}
        actions={
          <StatusBadge tone={hypervelocity ? 'warning' : 'accent'}>
            {hypervelocity ? 'hypervelocity' : 'sub-escape'}
          </StatusBadge>
        }
      />
      <PanelSection title="Impactor" dense>
        <NumberField
          label="Impactor mass"
          value={impactorMass}
          min={0}
          step={1e5}
          suffix="kg"
          onChange={(value) => setImpactorMass(Math.max(0, value))}
        />
        <NumberField
          label="Impact speed"
          value={speedKmS}
          min={0}
          step={1}
          suffix="km/s"
          onChange={(value) => setSpeedKmS(Math.max(0, value))}
        />
        <NumberField
          label="Target density"
          value={targetDensity}
          min={1}
          step={100}
          suffix="kg/m³"
          onChange={(value) => setTargetDensity(Math.max(1, value))}
        />
      </PanelSection>
      <PanelSection title="Impact budget" dense>
        <StatGrid
          label="Impact estimates"
          items={[
            { id: 'energy', label: 'Kinetic energy', value: fmt(report.energy, 3), unit: 'J' },
            { id: 'tnt', label: 'TNT equivalent', value: fmt(tnt, 3), unit: 'Mt' },
            { id: 'crater', label: 'Crater diameter', value: fmt(report.crater, 3), unit: 'm' },
            { id: 'escape', label: 'Escape speed', value: fmt(report.escape === null ? null : report.escape / 1000, 3), unit: 'km/s' },
          ]}
        />
        <div className="mt-3">
          <KeyValueList
            label="Impact context"
            items={[
              { label: 'Target gravity', value: `${fmt(report.gravity, 3)} m/s²`, mono: true },
              { label: 'Target radius', value: `${formatScientific(target.physical.radius, 3)} m`, mono: true },
              { label: 'Crater / radius', value: fmt(report.crater === null ? null : report.crater / target.physical.radius, 4), mono: true },
            ]}
          />
        </div>
      </PanelSection>
      <PanelSection title="Model note" dense>
        <InfoNote title="Order-of-magnitude only" tone="warning">
          Classical ½mv² energy and a gravity-scaled transient-crater diameter. Impactor density, strength, entry
          angle and atmospheric effects are not included.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}

function gravityValue(mass: number, radius: number): number {
  const gravity = surfaceGravityAtAltitude(mass, radius, 0);
  if (!Number.isFinite(gravity) || gravity <= 0) throw new RangeError('invalid surface gravity');
  return gravity;
}
