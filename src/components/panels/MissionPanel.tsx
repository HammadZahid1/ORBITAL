import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { calculateOrbitalElements } from '../../engine/orbits/orbital';
import { hohmannTransfer } from '../../engine/orbits/transfer';
import { bodyIndex } from '../../engine/physics/world';
import { AU, formatDuration, formatScientific } from '../../engine/numeric';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, Button, NumberField, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';

/** Mission Lab: first-order two-impulse transfer planning from a live orbit. */
export function MissionPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const [targetAu, setTargetAu] = useState(1.52);
  const selected = bodies.find((body) => body.id === selectedId);
  const primary = bodies.find((body) => body.id === selected?.parentId);

  const plan = useMemo(() => {
    if (!selected || !primary) return null;
    const index = bodyIndex(engine.world, selected.id);
    const parentIndex = bodyIndex(engine.world, primary.id);
    if (index < 0 || parentIndex < 0) return null;
    const elements = calculateOrbitalElements(engine.world, index, parentIndex);
    if (!elements) return null;
    return {
      elements,
      transfer: hohmannTransfer(elements.mu, elements.radius, targetAu * AU),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, primary, selected, targetAu]);

  return (
    <Panel>
      <PanelHeader
        title="Mission Lab"
        subtitle={selected ? `Departing ${selected.name}` : 'Select a departure body'}
        icon={<FlaskConical size={14} />}
        actions={<Badge tone="accent">2-impulse</Badge>}
      />
      <PanelSection title="Target orbit" dense>
        <NumberField label="Target radius" value={targetAu} min={0.05} step={0.05} suffix="AU" onChange={setTargetAu} />
        {plan?.elements && (
          <PropertyRow label="Departure radius" value={`${(plan.elements.radius / AU).toFixed(4)} AU`} accent />
        )}
      </PanelSection>
      {plan?.transfer ? (
        <PanelSection title="Transfer budget" dense>
          <PropertyRow label="Departure burn" value={`${formatScientific(plan.transfer.departureBurn)} m/s`} accent />
          <PropertyRow label="Arrival burn" value={`${formatScientific(plan.transfer.arrivalBurn)} m/s`} />
          <PropertyRow label="Total Δv" value={`${formatScientific(plan.transfer.totalDeltaV)} m/s`} />
          <PropertyRow label="Transfer duration" value={formatDuration(plan.transfer.transferTime)} />
          <PropertyRow label="Transfer eccentricity" value={formatScientific(plan.transfer.eccentricity, 4)} />
          <p className="mt-2 text-[9px] leading-relaxed text-faint">
            Assumes circular, coplanar orbits and instantaneous impulses. Launch windows and plane changes are not solved.
          </p>
        </PanelSection>
      ) : (
        <PanelSection title="No solution" dense>
          <p className="text-[9px] leading-relaxed text-faint">
            Select an orbiting body with a defined parent, then choose a different target radius.
          </p>
          <Button size="sm" className="mt-2 w-full" onClick={() => useSimulationStore.getState().setSelected(bodies[1]?.id ?? null)}>
            Select first orbiter
          </Button>
        </PanelSection>
      )}
    </Panel>
  );
}
