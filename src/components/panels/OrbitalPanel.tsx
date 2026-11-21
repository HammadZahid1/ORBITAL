import { useMemo, useState } from 'react';
import { CircleDot } from 'lucide-react';
import { calculateOrbitalElements } from '../../engine/orbits/orbital';
import { predictTrajectory } from '../../engine/trajectory/prediction';
import { bodyIndex } from '../../engine/physics/world';
import { formatDuration, formatScientific } from '../../engine/numeric';
import { hohmannTransfer } from '../../engine/orbits/transfer';
import { AU } from '../../engine/numeric';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, Button, NumberField, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';

/** Orbital mechanics workspace with osculating elements and forecast tools. */
export function OrbitalPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const integrator = useSimulationStore((state) => state.integrator);
  const [horizonDays, setHorizonDays] = useState(365);
  const [targetAu, setTargetAu] = useState(1.5);

  const body = bodies.find((item) => item.id === selectedId);
  const parent = bodies.find((item) => item.id === body?.parentId);

  const analysis = useMemo(() => {
    if (!body) return null;
    const index = bodyIndex(engine.world, body.id);
    const parentIndex = body.parentId ? bodyIndex(engine.world, body.parentId) : -1;
    if (index < 0 || parentIndex < 0) return null;
    const elements = calculateOrbitalElements(engine.world, index, parentIndex);
    if (!elements) return null;
    const steps = Math.max(1, Math.min(4000, Math.round((horizonDays * 86400) / Math.max(engine.options.timestep, 60))));
    const path = predictTrajectory(engine.world, index, {
      steps,
      dt: engine.options.timestep,
      integrator,
      sampleEvery: Math.max(1, Math.floor(steps / 120)),
    });
    const transfer = hohmannTransfer(elements.mu, elements.radius, targetAu * AU);
    return { elements, pathLength: path.length, transfer };
    // frame intentionally invalidates this cache when the mutable engine state advances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, frame, horizonDays, integrator, targetAu]);

  return (
    <Panel>
      <PanelHeader
        title="Orbital Mechanics"
        subtitle={body ? `${body.name} around ${parent?.name ?? 'primary'}` : 'No orbit selected'}
        icon={<CircleDot size={14} />}
        actions={analysis?.elements.isBound ? <Badge tone="success">bound</Badge> : <Badge tone="warning">unbound</Badge>}
      />
      {analysis && (
        <>
          <PanelSection title="Osculating elements" dense>
            <PropertyRow label="Eccentricity" value={formatScientific(analysis.elements.eccentricity, 5)} accent />
            <PropertyRow label="Semimajor axis" value={`${formatScientific(analysis.elements.semiMajorAxis)} m`} />
            <PropertyRow label="Period" value={formatDuration(analysis.elements.period)} />
            <PropertyRow label="Periapsis" value={`${formatScientific(analysis.elements.periapsis)} m`} />
            <PropertyRow label="Apoapsis" value={`${formatScientific(analysis.elements.apoapsis)} m`} />
            <PropertyRow label="Specific energy" value={`${formatScientific(analysis.elements.specificEnergy)} J/kg`} />
          </PanelSection>
          <PanelSection title="Numerical forecast" dense>
            <NumberField label="Horizon (days)" value={horizonDays} min={1} max={36500} step={30} onChange={setHorizonDays} />
            <PropertyRow label="Samples" value={analysis.pathLength} />
            <PropertyRow label="Integrator" value={integrator} />
            <p className="mt-2 text-[9px] leading-relaxed text-faint">
              Forecasts propagate a copy of the live world. Error accumulates with horizon length.
            </p>
          </PanelSection>
          <PanelSection title="Hohmann comparison" dense>
            <NumberField label="Target radius" value={targetAu} min={0.01} step={0.1} suffix="AU" onChange={setTargetAu} />
            {analysis.transfer ? (
              <>
                <PropertyRow label="Departure Δv" value={`${formatScientific(analysis.transfer.departureBurn)} m/s`} accent />
                <PropertyRow label="Arrival Δv" value={`${formatScientific(analysis.transfer.arrivalBurn)} m/s`} />
                <PropertyRow label="Total Δv" value={`${formatScientific(analysis.transfer.totalDeltaV)} m/s`} />
                <PropertyRow label="Transfer time" value={formatDuration(analysis.transfer.transferTime)} />
              </>
            ) : (
              <p className="text-[9px] text-faint">Choose a target radius different from the current radius.</p>
            )}
          </PanelSection>
        </>
      )}
      {!analysis && (
        <PanelSection title="No orbit" dense>
          <Button size="sm" onClick={() => useSimulationStore.getState().setSelected(bodies[1]?.id ?? bodies[0]?.id ?? null)}>
            Select an orbiter
          </Button>
        </PanelSection>
      )}
    </Panel>
  );
}
