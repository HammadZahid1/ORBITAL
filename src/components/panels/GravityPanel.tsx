import { useMemo } from 'react';
import { Atom } from 'lucide-react';
import { analyseStability } from '../../engine/energy/stability';
import { INTEGRATOR_LIST } from '../../engine/integrators';
import { formatScientific } from '../../engine/numeric';
import { engine, useSimulationStore } from '../../state/simulationStore';
import { Badge, Meter, Panel, PanelHeader, PanelSection, PropertyRow, Select, Slider, Toggle } from '../ui';
import type { CollisionMode } from '../../types/celestial';

/** Gravity Lab: integrator comparison, conservation and collision controls. */
export function GravityPanel() {
  const frame = useSimulationStore((state) => state.frame);
  const initialEnergy = useSimulationStore((state) => state.initialEnergy);
  const integrator = useSimulationStore((state) => state.integrator);
  const setIntegrator = useSimulationStore((state) => state.setIntegrator);
  const softening = useSimulationStore((state) => state.softening);
  const setSoftening = useSimulationStore((state) => state.setSoftening);
  const collisionMode = useSimulationStore((state) => state.collisionMode);
  const setCollisionMode = useSimulationStore((state) => state.setCollisionMode);
  const collisionsEnabled = useSimulationStore((state) => state.collisionsEnabled);
  const setCollisionsEnabled = useSimulationStore((state) => state.setCollisionsEnabled);

  const stability = useMemo(
    () => analyseStability(engine.world, initialEnergy),
    // Frame changes signal that the solver has advanced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame, initialEnergy],
  );
  const active = INTEGRATOR_LIST.find((item) => item.id === integrator);

  return (
    <Panel>
      <PanelHeader
        title="Gravity Lab"
        subtitle="Softened Newtonian N-body solver"
        icon={<Atom size={14} />}
        actions={<Badge tone="accent">{engine.world.count} bodies</Badge>}
      />
      <PanelSection title="Integrator" dense>
        <Select
          label="Method"
          value={integrator}
          options={INTEGRATOR_LIST.map((item) => ({ value: item.id, label: item.label }))}
          onChange={setIntegrator}
        />
        <p className="text-[9px] leading-relaxed text-faint">{active?.description}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <PropertyRow label="Order" value={active?.order ?? '—'} />
          <PropertyRow label="Force evals" value={active?.evaluations ?? '—'} />
        </div>
        <div className="mt-2 space-y-1.5">
          {INTEGRATOR_LIST.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between text-[9px] text-muted">
                <span>{item.shortLabel}</span>
                <span className="orb-mono">O(dt^{item.order})</span>
              </div>
              <Meter value={item.order} max={4} tone={item.id === integrator ? 'accent' : 'line'} />
            </div>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Conservation" dense>
        <PropertyRow label="Total energy" value={`${formatScientific(stability.energy.total)} J`} accent />
        <PropertyRow label="Energy drift" value={`${formatScientific(stability.absoluteDrift)} J`} />
        <PropertyRow label="Relative drift" value={formatScientific(stability.relativeDrift, 3)} />
        <PropertyRow label="Momentum residual" value={`${formatScientific(stability.momentumResidual)} kg·m/s`} />
        <PropertyRow label="Angular momentum" value={`${formatScientific(stability.energy.angularMomentumMagnitude)} kg·m²/s`} />
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          Drift is measured against the energy at the last reset or structural edit. Non-symplectic methods drift more.
        </p>
      </PanelSection>
      <PanelSection title="Solver parameters" dense>
        <Slider
          label="Softening length"
          value={Math.log10(Math.max(softening, 1))}
          min={0}
          max={9}
          step={0.05}
          display={`${formatScientific(softening, 1)} m`}
          onChange={(value) => setSoftening(10 ** value)}
        />
        <Toggle label="Enable collisions" checked={collisionsEnabled} onChange={setCollisionsEnabled} />
        <Select<CollisionMode>
          label="Collision response"
          value={collisionMode}
          options={[
            { value: 'none', label: 'None' },
            { value: 'elastic', label: 'Elastic bounce' },
            { value: 'inelastic', label: 'Inelastic bounce' },
            { value: 'merge', label: 'Perfect merge' },
          ]}
          onChange={setCollisionMode}
        />
      </PanelSection>
    </Panel>
  );
}
