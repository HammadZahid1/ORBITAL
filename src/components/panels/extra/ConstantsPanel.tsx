import { Ruler } from 'lucide-react';
import {
  AU,
  C,
  DAY,
  EARTH_MASS,
  EARTH_RADIUS,
  G,
  SOLAR_MASS,
  YEAR,
} from '../../../engine/numeric';
import { formatScientific } from '../../../engine/numeric';
import { useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  CopyButton,
  InfoNote,
  KeyValueList,
  StatusBadge,
} from '../../ui/extra';

const CONSTANTS = [
  { label: 'Gravitational constant G', value: `${formatScientific(G, 6)} m³ kg⁻¹ s⁻²` },
  { label: 'Speed of light c', value: `${formatScientific(C, 9)} m/s` },
  { label: 'Astronomical unit', value: `${formatScientific(AU, 9)} m` },
  { label: 'Solar mass', value: `${formatScientific(SOLAR_MASS, 6)} kg` },
  { label: 'Earth mass', value: `${formatScientific(EARTH_MASS, 6)} kg` },
  { label: 'Earth radius', value: `${formatScientific(EARTH_RADIUS, 6)} m` },
  { label: 'Julian day', value: `${formatScientific(DAY, 6)} s` },
  { label: 'Julian year', value: `${formatScientific(YEAR, 6)} s` },
] as const;

/** SI reference values and the currently active solver settings. */
export function ConstantsPanel() {
  const timestep = useSimulationStore((state) => state.timestep);
  const timeScale = useSimulationStore((state) => state.timeScale);
  const softening = useSimulationStore((state) => state.softening);
  const integrator = useSimulationStore((state) => state.integrator);
  const collisionMode = useSimulationStore((state) => state.collisionMode);
  const bodies = useSimulationStore((state) => state.bodies);

  const summary = [
    ...CONSTANTS.map(({ label, value }) => `${label}: ${value}`),
    `Integrator: ${integrator}`,
    `Timestep: ${formatScientific(timestep, 6)} s`,
    `Time scale: ${formatScientific(timeScale, 6)} s/s`,
    `Softening: ${formatScientific(softening, 6)} m`,
    `Collision mode: ${collisionMode}`,
  ].join('\n');

  return (
    <Panel>
      <PanelHeader
        title="Constants & Units"
        subtitle="SI reference values and live solver settings"
        icon={<Ruler size={14} />}
        actions={<StatusBadge tone="accent">SI</StatusBadge>}
      />
      <PanelSection title="Physical constants" dense>
        <KeyValueList
          label="Physical constants"
          items={CONSTANTS.map(({ label, value }) => ({ label, value, mono: true }))}
          dense
        />
      </PanelSection>
      <PanelSection title="Active solver settings" dense>
        <KeyValueList
          label="Solver settings"
          items={[
            { label: 'Integrator', value: integrator, mono: true },
            { label: 'Base timestep', value: `${formatScientific(timestep, 6)} s`, mono: true },
            { label: 'Time scale', value: `${formatScientific(timeScale, 6)} s/s`, mono: true },
            { label: 'Softening length', value: `${formatScientific(softening, 6)} m`, mono: true },
            { label: 'Collision mode', value: collisionMode, mono: true },
            { label: 'Body count', value: bodies.length, mono: true },
          ]}
          dense
        />
        <div className="mt-3">
          <CopyButton value={summary} label="Copy reference" copiedLabel="Copied reference" />
        </div>
      </PanelSection>
      <PanelSection title="Conventions" dense>
        <InfoNote title="Units and frame" tone="info">
          Positions are metres, masses kilograms and times seconds in the simulation's inertial frame. Visual radii
          are compressed separately and never affect the solver.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
