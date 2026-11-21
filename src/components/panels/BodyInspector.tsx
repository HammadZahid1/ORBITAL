import { useMemo } from 'react';
import { CircleDot } from 'lucide-react';
import { calculateOrbitalElements } from '../../engine/orbits/orbital';
import { bodyIndex, readVec3 } from '../../engine/physics/world';
import { formatDuration, formatScientific } from '../../engine/numeric';
import { length3 } from '../../engine/vector';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, EmptyState, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';

/** Read-only physical and orbital summary for the selected body. */
export function BodyInspector() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const body = bodies.find((candidate) => candidate.id === selectedId);

  const diagnostics = useMemo(() => {
    if (!body) return null;
    const world = engine.world;
    const index = bodyIndex(world, body.id);
    if (index < 0) return null;
    const parentIndex = body.parentId ? bodyIndex(world, body.parentId) : -1;
    return {
      index,
      position: readVec3(world.pos, index),
      velocity: readVec3(world.vel, index),
      acceleration: readVec3(world.acc, index),
      elements: parentIndex >= 0 ? calculateOrbitalElements(world, index, parentIndex) : null,
    };
  }, [body, frame]);

  if (!body || !diagnostics) {
    return (
      <Panel>
        <PanelHeader title="Body inspector" icon={<CircleDot size={14} />} />
        <EmptyState title="No body selected" detail="Click a body in the viewport or body list to inspect its live state." />
      </Panel>
    );
  }

  const vector = (value: { x: number; y: number; z: number }, digits = 2) =>
    `(${formatScientific(value.x, digits)}, ${formatScientific(value.y, digits)}, ${formatScientific(value.z, digits)})`;

  return (
    <Panel>
      <PanelHeader
        title={body.name}
        subtitle={body.parentId ? `Orbiting ${bodies.find((item) => item.id === body.parentId)?.name ?? body.parentId}` : 'Independent body'}
        icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: body.visual.color }} />}
        actions={<Badge tone={body.type === 'star' ? 'warning' : 'accent'}>{body.type}</Badge>}
      />
      <PanelSection title="Physical state" dense>
        <PropertyRow label="Mass" value={`${formatScientific(body.physical.mass)} kg`} />
        <PropertyRow label="Radius" value={`${formatScientific(body.physical.radius)} m`} />
        <PropertyRow label="Position" value={vector(diagnostics.position)} />
        <PropertyRow label="Velocity" value={vector(diagnostics.velocity)} />
        <PropertyRow label="Speed" value={`${formatScientific(length3(diagnostics.velocity))} m/s`} accent />
        <PropertyRow label="Acceleration" value={vector(diagnostics.acceleration, 1)} />
        <PropertyRow label="Spin rate" value={`${formatScientific(body.physical.rotationSpeed)} rad/s`} />
      </PanelSection>
      {diagnostics.elements && (
        <PanelSection title="Osculating elements" dense>
          <PropertyRow label="Eccentricity" value={formatScientific(diagnostics.elements.eccentricity, 4)} />
          <PropertyRow label="Semimajor axis" value={`${formatScientific(diagnostics.elements.semiMajorAxis)} m`} />
          <PropertyRow label="Periapsis" value={`${formatScientific(diagnostics.elements.periapsis)} m`} />
          <PropertyRow label="Apoapsis" value={`${formatScientific(diagnostics.elements.apoapsis)} m`} />
          <PropertyRow label="Period" value={formatDuration(diagnostics.elements.period)} />
          <PropertyRow label="Inclination" value={`${formatScientific((diagnostics.elements.inclination * 180) / Math.PI, 2)}°`} />
          <PropertyRow label="Bound orbit" value={diagnostics.elements.isBound ? 'yes' : 'no'} accent={diagnostics.elements.isBound} />
        </PanelSection>
      )}
      {body.notes && (
        <PanelSection title="Notes" dense>
          <p className="text-[10px] leading-relaxed text-muted">{body.notes}</p>
        </PanelSection>
      )}
    </Panel>
  );
}
