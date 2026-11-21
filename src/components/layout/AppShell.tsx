import { useEffect } from 'react';
import { Crosshair, Eye } from 'lucide-react';
import { SpaceScene } from '../celestial/SpaceScene';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSimulationLoop } from '../../hooks/useSimulationLoop';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { Badge, IconButton } from '../ui';
import { BottomPanel } from './BottomPanel';
import { CommandPalette } from './CommandPalette';
import { HelpDialog } from './HelpDialog';
import { LeftNav } from './LeftNav';
import { Notifications } from './Notifications';
import { RightPanel } from './RightPanel';
import { SettingsDialog } from './SettingsDialog';
import { TopNav } from './TopNav';

/** Root application layout: navigation, viewport, inspectors and overlays. */
export function AppShell() {
  useSimulationLoop();
  useKeyboardShortcuts();

  const theme = useUIStore((state) => state.settings.theme);
  const reduceMotion = useUIStore((state) => state.settings.reduceMotion);
  const focusMode = useUIStore((state) => state.focusMode);
  const setFocusMode = useUIStore((state) => state.setFocusMode);
  const scaleMode = useUIStore((state) => state.scaleMode);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedName = bodies.find((body) => body.id === selectedId)?.name;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-void text-ink ${reduceMotion ? 'orb-reduced-motion' : ''}`}>
      <TopNav />
      <div className="relative flex min-h-0 flex-1">
        {!focusMode && <LeftNav />}
        <main className="orb-grid-bg orb-noise relative min-w-0 flex-1">
          <div className="absolute inset-0">
            <SpaceScene />
          </div>
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
            <Badge tone="accent">{scaleMode}</Badge>
            {selectedName && <Badge tone="neutral">selected: {selectedName}</Badge>}
          </div>
          <div className="absolute right-3 top-3 z-10">
            <IconButton
              label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
              icon={focusMode ? <Eye size={15} /> : <Crosshair size={15} />}
              active={focusMode}
              onClick={() => setFocusMode(!focusMode)}
              className="border-line bg-panel/80"
            />
          </div>
        </main>
        {!focusMode && <RightPanel />}
      </div>
      {!focusMode && <BottomPanel />}
      <CommandPalette />
      <SettingsDialog />
      <HelpDialog />
      <Notifications />
    </div>
  );
}
