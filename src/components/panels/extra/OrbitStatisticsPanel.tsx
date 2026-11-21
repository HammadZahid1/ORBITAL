import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { formatDuration, formatScientific } from '../../../engine/numeric';
import { calculateOrbitalElements } from '../../../engine/orbits/orbital';
import { bodyIndex } from '../../../engine/physics/world';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  StatGrid,
  StatusBadge,
} from '../../ui/extra';

/** Osculating orbit statistics for the selected body about its parent. */
export function OrbitStatisticsPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);

  const report = useMemo(() => {
    const body = bodies.find((candidate) => candidate.id === selectedId) ?? null;
    if (!body || !body.parentId) return null;
    const parent = bodies.find((candidate) => candidate.id === body.parentId) ?? null;
    if (!parent) return null;
    const world = engine.world;
    const index = bodyIndex(world, body.id);
    const parentIndex = bodyIndex(world, parent.id);
    const elements = index >= 0 && parentIndex >= 0 ? calculateOrbitalElements(world, index, parentIndex) : null;
    return elements ? { body, parent, elements } : null;
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId]);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Orbit Statistics" icon={<Activity size={14} />} />
        <EmptyState
          title="No orbit available"
          description="Select a body with a defined parent to compute osculating Keplerian statistics."
        />
      </Panel>
    );
  }

  const { body, parent, elements } = report;
  const fmt = (value: number, digits = 3) => formatScientific(value, digits);
  const finitePeriod = Number.isFinite(elements.period);

  return (
    <Panel>
      <PanelHeader
        title="Orbit Statistics"
        subtitle={`${body.name} about ${parent.name}`}
        icon={<Activity size={14} />}
        actions={
          <StatusBadge tone={elements.isBound ? 'success' : 'danger'} dot>
            {elements.isBound ? 'bound orbit' : 'unbound trajectory'}
          </StatusBadge>
        }
      />
      <PanelSection title="Keplerian summary" dense>
        <StatGrid
          label="Orbit statistics"
          items={[
            { id: 'period', label: 'Period', value: finitePeriod ? formatDuration(elements.period) : '—' },
            { id: 'eccentricity', label: 'Eccentricity', value: fmt(elements.eccentricity, 5) },
            { id: 'axis', label: 'Semimajor axis', value: fmt(elements.semiMajorAxis, 4), unit: 'm' },
            {
              id: 'inclination',
              label: 'Inclination',
              value: fmt((elements.inclination * 180) / Math.PI, 2),
              unit: '°',
            },
          ]}
        />
      </PanelSection>
      <PanelSection title="Detailed elements" dense>
        <KeyValueList
          label="Orbital elements"
          items={[
            { label: 'Periapsis', value: `${fmt(elements.periapsis, 4)} m`, mono: true },
            {
              label: 'Apoapsis',
              value: Number.isFinite(elements.apoapsis) ? `${fmt(elements.apoapsis, 4)} m` : '—',
              mono: true,
            },
            { label: 'Current radius', value: `${fmt(elements.radius, 4)} m`, mono: true },
            { label: 'Relative speed', value: `${fmt(elements.speed, 4)} m/s`, mono: true },
            { label: 'Specific energy', value: `${fmt(elements.specificEnergy, 4)} J/kg`, mono: true },
            {
              label: 'Specific ang. mom.',
              value: `${fmt(elements.angularMomentumMagnitude, 4)} m²/s`,
              mono: true,
            },
            { label: 'True anomaly', value: `${fmt((elements.trueAnomaly * 180) / Math.PI, 2)}°`, mono: true },
            {
              label: 'Argument of periapsis',
              value: `${fmt((elements.argumentOfPeriapsis * 180) / Math.PI, 2)}°`,
              mono: true,
            },
          ]}
        />
      </PanelSection>
      <PanelSection title="Interpretation" dense>
        <InfoNote title="Osculating, two-body" tone="info">
          Elements describe the instantaneous ellipse of an isolated pair. Other bodies perturb the real trajectory,
          so the values drift even without numerical error.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
