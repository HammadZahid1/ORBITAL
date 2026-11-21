import { Crosshair } from 'lucide-react';
import { formatScientific } from '../../engine/numeric';
import {
  escapeSpeed,
  hillRadius,
  relativisticBeta,
  rocheLimit,
  schwarzschildRadius,
  surfaceGravity,
} from '../../engine/physics/limits';
import { length3, sub3 } from '../../engine/vector';
import { useSimulationStore } from '../../state/simulationStore';
import { Badge, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';

/** Extreme Physics: approximate compact-object and tidal-limit diagnostics. */
export function ExtremePanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const selected = bodies.find((body) => body.id === selectedId);
  const body = selected ?? bodies[0];
  const primary = bodies.find((item) => item.type === 'star' || item.type === 'blackhole') ?? bodies[0];
  const distance = body && primary ? length3(sub3(body.physical.position, primary.physical.position)) : 0;
  const speed = body ? length3(body.physical.velocity) : 0;
  const mass = body?.physical.mass ?? 0;
  const radius = body?.physical.radius ?? 0;

  return (
    <Panel>
      <PanelHeader
        title="Extreme Physics"
        subtitle={body ? body.name : 'No body selected'}
        icon={<Crosshair size={14} />}
        actions={body?.type === 'blackhole' ? <Badge tone="danger">compact object</Badge> : <Badge tone="warning">approximate</Badge>}
      />
      <PanelSection title="Selected body" dense>
        <PropertyRow label="Mass" value={`${formatScientific(mass)} kg`} />
        <PropertyRow label="Radius" value={`${formatScientific(radius)} m`} />
        <PropertyRow label="Speed" value={`${formatScientific(speed)} m/s`} />
        <PropertyRow label="Speed / c" value={formatScientific(relativisticBeta(speed), 5)} accent />
      </PanelSection>
      <PanelSection title="Limits" dense>
        <PropertyRow label="Surface gravity" value={`${formatScientific(surfaceGravity(mass, radius))} m/s²`} />
        <PropertyRow label="Escape speed" value={`${formatScientific(escapeSpeed(mass, radius))} m/s`} />
        <PropertyRow label="Schwarzschild radius" value={`${formatScientific(schwarzschildRadius(mass))} m`} />
        <PropertyRow
          label="Hill radius"
          value={`${formatScientific(hillRadius(mass, primary?.physical.mass ?? 0, distance))} m`}
        />
        <PropertyRow
          label="Roche limit"
          value={`${formatScientific(rocheLimit(primary?.physical.radius ?? 0, 5500, 3000))} m`}
        />
      </PanelSection>
      <PanelSection title="Model note" dense>
        <p className="text-[9px] leading-relaxed text-faint">
          Schwarzschild and Roche values are closed-form estimates. The solver remains Newtonian and does not model
          relativistic time dilation, tidal deformation or horizon physics.
        </p>
      </PanelSection>
    </Panel>
  );
}
