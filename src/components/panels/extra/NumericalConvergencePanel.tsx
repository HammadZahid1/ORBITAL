import { useMemo } from 'react';
import { Sigma } from 'lucide-react';
import { computeEnergy, energyDrift } from '../../../engine/energy/energy';
import { analyseStability } from '../../../engine/energy/stability';
import { formatScientific } from '../../../engine/numeric';
import { calculateOrbitalElements } from '../../../engine/orbits/orbital';
import { bodyIndex } from '../../../engine/physics/world';
import { createSimulationEngine } from '../../../engine/simulation/engine';
import { engine, useSimulationStore } from '../../../state/simulationStore';
import { Panel, PanelHeader, PanelSection } from '../../ui';
import {
  EmptyState,
  InfoNote,
  KeyValueList,
  ProgressMeter,
  StatGrid,
  StatusBadge,
} from '../../ui/extra';

const PROBE_STEPS = 10;

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

/** Reports conservation drift and a small step-halving convergence probe. */
export function NumericalConvergencePanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const frame = useSimulationStore((state) => state.frame);
  const initialEnergy = useSimulationStore((state) => state.initialEnergy);
  const timestep = useSimulationStore((state) => state.timestep);
  const softening = useSimulationStore((state) => state.softening);
  const integrator = useSimulationStore((state) => state.integrator);

  const stability = useMemo(
    () => (bodies.length > 0 ? analyseStability(engine.world, finite(initialEnergy) ?? 0) : null),
    // Frame is a mutable-world invalidation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodies.length, frame, initialEnergy],
  );

  const stepsPerOrbit = useMemo(() => {
    const body = bodies.find((candidate) => candidate.id === selectedId) ?? null;
    if (!body?.parentId || !Number.isFinite(timestep) || timestep <= 0) return null;
    const world = engine.world;
    const index = bodyIndex(world, body.id);
    const parentIndex = bodyIndex(world, body.parentId);
    const elements = index >= 0 && parentIndex >= 0 ? calculateOrbitalElements(world, index, parentIndex) : null;
    if (!elements || !elements.isBound || !Number.isFinite(elements.period)) return null;
    return elements.period / timestep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, selectedId, timestep]);

  const probes = useMemo(() => {
    if (bodies.length === 0 || bodies.length > 12 || !Number.isFinite(timestep) || timestep <= 0) return [];
    return [1, 0.5, 0.25].map((scale) => {
      const dt = Math.max(timestep * scale, 1e-6);
      try {
        const trial = createSimulationEngine(bodies, {
          G: engine.world.G,
          timestep: dt,
          softening: Math.max(softening, 0),
          integrator,
          collisionMode: 'none',
          collisionsEnabled: false,
        });
        const start = computeEnergy(trial.world).total;
        for (let step = 0; step < PROBE_STEPS; step += 1) trial.step();
        const drift = energyDrift(computeEnergy(trial.world).total, start);
        return { scale, dt, drift: finite(drift) };
      } catch {
        return { scale, dt, drift: null };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies, frame, integrator, softening, timestep]);

  if (!stability) {
    return (
      <Panel>
        <PanelHeader title="Convergence Report" icon={<Sigma size={14} />} />
        <EmptyState
          title="No solver state"
          description="Add bodies to the universe to measure energy and step-size convergence."
        />
      </Panel>
    );
  }

  const fmt = (value: number | null, digits = 3) =>
    value === null ? '—' : formatScientific(value, digits);
  const driftValues = probes.map((probe) => (probe.drift === null ? null : Math.abs(probe.drift)));
  const converging =
    driftValues.length === 3 &&
    driftValues.every((value) => value !== null) &&
    driftValues[0]! >= driftValues[1]! &&
    driftValues[1]! >= driftValues[2]!;
  const resolution = finite(stepsPerOrbit ?? NaN);

  return (
    <Panel>
      <PanelHeader
        title="Convergence Report"
        subtitle={`${bodies.length} bodies · ${integrator}`}
        icon={<Sigma size={14} />}
        actions={
          <StatusBadge tone={converging ? 'success' : 'warning'} dot>
            {converging ? 'drift decreasing' : 'review step size'}
          </StatusBadge>
        }
      />
      <PanelSection title="Conservation" dense>
        <StatGrid
          label="Conservation diagnostics"
          items={[
            { id: 'total', label: 'Total energy', value: fmt(finite(stability.energy.total), 3), unit: 'J' },
            { id: 'relative', label: 'Relative drift', value: fmt(finite(stability.relativeDrift), 3) },
            { id: 'momentum', label: 'Momentum residual', value: fmt(finite(stability.momentumResidual), 3), unit: 'kg·m/s' },
            { id: 'steps', label: 'Solver steps', value: String(engine.world.steps) },
          ]}
        />
        <div className="mt-3">
          <ProgressMeter
            label="Steps per selected orbit"
            value={resolution ?? 0}
            min={0}
            max={200}
            valueText={resolution === null ? '—' : formatScientific(resolution, 1)}
            tone={resolution !== null && resolution < 50 ? 'warning' : 'accent'}
          />
        </div>
      </PanelSection>
      <PanelSection title="Step-halving probe" dense>
        <KeyValueList
          label="Convergence probe"
          items={probes.map((probe) => ({
            label: `${probe.scale}× dt (${formatScientific(probe.dt, 2)} s)`,
            value: fmt(probe.drift, 3),
            mono: true,
          }))}
        />
        <div className="mt-3">
          <KeyValueList
            label="Convergence settings"
            items={[
              { label: 'Integrator', value: integrator, mono: true },
              { label: 'Base timestep', value: `${formatScientific(timestep, 3)} s`, mono: true },
              { label: 'Softening', value: `${formatScientific(softening, 3)} m`, mono: true },
              { label: 'Probe window', value: `${PROBE_STEPS} steps`, mono: true },
            ]}
          />
        </div>
      </PanelSection>
      <PanelSection title="Interpretation" dense>
        <InfoNote title="Controlled local trial" tone="info">
          The probe copies the current bodies into a fresh world and integrates a short window at full, half and
          quarter steps. It does not change the running simulation; close-to-zero drift can still mask phase error.
        </InfoNote>
      </PanelSection>
    </Panel>
  );
}
