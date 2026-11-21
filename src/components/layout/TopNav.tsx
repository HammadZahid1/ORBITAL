import {
  Gauge,
  HelpCircle,
  Maximize2,
  Minimize2,
  Orbit,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  SkipForward,
} from 'lucide-react';
import { IconButton } from '../ui';
import { formatDuration } from '../../engine/numeric';
import { useFullscreen } from '../../hooks/useFullscreen';
import { moduleLabel } from '../../state/moduleRegistry';
import { performanceMonitor } from '../../state/performanceMonitor';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';

/** Application header with identity, transport controls and global actions. */
export function TopNav() {
  const activeModule = useUIStore((state) => state.activeModule);
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const setHelpOpen = useUIStore((state) => state.setHelpOpen);
  const toggleLeft = useUIStore((state) => state.toggleLeft);
  const toggleRight = useUIStore((state) => state.toggleRight);
  const leftCollapsed = useUIStore((state) => state.leftCollapsed);
  const rightCollapsed = useUIStore((state) => state.rightCollapsed);
  const showFps = useUIStore((state) => state.settings.showFps);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const playing = useSimulationStore((state) => state.playing);
  const togglePlaying = useSimulationStore((state) => state.togglePlaying);
  const stepOnce = useSimulationStore((state) => state.stepOnce);
  const reset = useSimulationStore((state) => state.reset);
  const simTime = useSimulationStore((state) => state.simTime);
  const speed = useSimulationStore((state) => state.speed);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const notify = useUIStore((state) => state.notify);

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-space/95 px-3">
      <div className="flex items-center gap-2 pr-3">
        <span className="grid h-7 w-7 place-items-center rounded-[3px] border border-accent/40 bg-accent/10 text-accent">
          <Orbit size={16} />
        </span>
        <div className="leading-none">
          <div className="text-[13px] font-bold tracking-[0.22em] text-ink">ORBITAL</div>
          <div className="mt-0.5 text-[9px] tracking-wider text-faint">UNIVERSE SIMULATOR</div>
        </div>
      </div>

      <div className="h-5 w-px bg-line" />

      <IconButton label="Toggle navigation" icon={<PanelLeft size={15} />} active={!leftCollapsed} onClick={toggleLeft} />
      <div className="min-w-0 px-1">
        <div className="truncate text-[11px] font-medium text-ink">{moduleLabel(activeModule)}</div>
        <div className="orb-mono truncate text-[9px] text-faint">t = {formatDuration(simTime)}</div>
      </div>

      <div className="mx-auto flex items-center gap-1 rounded-[3px] border border-line bg-graphite/70 p-0.5">
        <IconButton
          label={playing ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
          icon={playing ? <Pause size={14} /> : <Play size={14} />}
          active={playing}
          size="sm"
          onClick={togglePlaying}
        />
        <IconButton label="Step forward (Right arrow)" icon={<SkipForward size={14} />} size="sm" onClick={stepOnce} />
        <IconButton
          label="Reset simulation (R)"
          icon={<RotateCcw size={14} />}
          size="sm"
          onClick={() => {
            reset();
            notify('Simulation returned to initial conditions');
          }}
        />
        <div className="mx-1 h-4 w-px bg-line" />
        <select
          aria-label="Simulation speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          className="h-6 rounded-[2px] border border-line bg-panel px-1.5 orb-mono text-[10px] text-accent outline-none"
        >
          {[0.25, 0.5, 1, 2, 5, 10, 25, 50].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </div>

      {showFps && (
        <div className="hidden items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 orb-mono text-[10px] text-faint sm:flex">
          <Gauge size={12} />
          <span className={performanceMonitor.fps < 40 ? 'text-warn' : 'text-success'}>
            {performanceMonitor.fps.toFixed(0)} fps
          </span>
        </div>
      )}

      <IconButton label="Command palette (Ctrl+K)" icon={<Search size={15} />} onClick={() => setCommandOpen(true)} />
      <IconButton label="Settings" icon={<Settings size={15} />} onClick={() => setSettingsOpen(true)} />
      <IconButton label="Help (?)" icon={<HelpCircle size={15} />} onClick={() => setHelpOpen(true)} />
      <IconButton
        label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        icon={isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        onClick={toggleFullscreen}
      />
      <IconButton
        label="Toggle inspector"
        icon={<PanelRight size={15} />}
        active={!rightCollapsed}
        onClick={toggleRight}
      />
    </header>
  );
}
