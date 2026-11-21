import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { INTEGRATOR_LIST } from '../../engine/integrators';
import { formatDuration, formatScientific } from '../../engine/numeric';
import { performanceMonitor } from '../../state/performanceMonitor';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { IconButton, KeyHint, Meter } from '../ui';

/** Simulation clock, solver controls and compact progress readout. */
export function Timeline() {
  const simTime = useSimulationStore((state) => state.simTime);
  const steps = useSimulationStore((state) => state.steps);
  const playing = useSimulationStore((state) => state.playing);
  const timestep = useSimulationStore((state) => state.timestep);
  const integrator = useSimulationStore((state) => state.integrator);
  const softening = useSimulationStore((state) => state.softening);
  const togglePlaying = useSimulationStore((state) => state.togglePlaying);
  const stepOnce = useSimulationStore((state) => state.stepOnce);
  const stepBack = useSimulationStore((state) => state.stepBack);
  const reset = useSimulationStore((state) => state.reset);
  const setTimestep = useSimulationStore((state) => state.setTimestep);
  const setIntegrator = useSimulationStore((state) => state.setIntegrator);
  const notify = useUIStore((state) => state.notify);
  const showFps = useUIStore((state) => state.settings.showFps);

  const cyclePosition = ((simTime / 31557600) % 1 + 1) % 1;

  return (
    <div className="flex h-full min-w-0 items-center gap-4 px-4">
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Step backward (Left arrow)" icon={<SkipBack size={14} />} onClick={stepBack} />
        <IconButton
          label={playing ? 'Pause (Space)' : 'Play (Space)'}
          icon={playing ? <Pause size={15} /> : <Play size={15} />}
          active={playing}
          onClick={togglePlaying}
        />
        <IconButton label="Step forward (Right arrow)" icon={<SkipForward size={14} />} onClick={stepOnce} />
        <IconButton
          label="Reset"
          icon={<RotateCcw size={14} />}
          onClick={() => {
            reset();
            notify('Simulation reset');
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="orb-mono text-[12px] text-ink">{formatDuration(simTime)}</span>
          <span className="orb-mono text-[9px] text-faint">{steps.toLocaleString()} solver steps</span>
        </div>
        <Meter value={cyclePosition} tone="accent" />
        <div className="mt-1 flex justify-between text-[8px] text-faint">
          <span>year cycle phase</span>
          <span>{formatScientific(timestep, 1)} s / step</span>
        </div>
      </div>

      <label className="hidden shrink-0 flex-col gap-1 md:flex">
        <span className="orb-label">Integrator</span>
        <select
          aria-label="Integrator"
          value={integrator}
          onChange={(event) => {
            const next = INTEGRATOR_LIST.find((item) => item.id === event.target.value);
            if (next) {
              setIntegrator(next.id);
              notify(`Integrator: ${next.label}`);
            }
          }}
          className="h-8 w-44 rounded-[3px] border border-line bg-panel-raised px-2 text-[10px] outline-none focus:border-accent"
        >
          {INTEGRATOR_LIST.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden shrink-0 space-y-1 lg:block">
        <div className="orb-label">Step</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-[2px] border border-line px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
            onClick={() => setTimestep(timestep / 2)}
          >
            ÷2
          </button>
          <span className="orb-mono w-20 text-center text-[10px] text-accent">{formatScientific(timestep, 1)} s</span>
          <button
            type="button"
            className="rounded-[2px] border border-line px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
            onClick={() => setTimestep(timestep * 2)}
          >
            ×2
          </button>
        </div>
        <div className="text-[9px] text-faint">ε = {formatScientific(softening, 1)} m</div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 xl:flex">
        <KeyHint>Space</KeyHint>
        <span className="text-[9px] text-faint">play</span>
        {showFps && <span className="orb-mono text-[9px] text-faint">{performanceMonitor.fps.toFixed(0)} fps</span>}
      </div>
    </div>
  );
}
