import { useState } from 'react';
import { Layers3, PanelRightClose, SlidersHorizontal, Wrench } from 'lucide-react';
import { moduleLabel } from '../../state/moduleRegistry';
import { useUIStore } from '../../state/uiStore';
import { IconButton } from '../ui';
import { LayerControls } from '../panels/LayerControls';
import { BodyInspector } from '../panels/BodyInspector';
import { ModulePanelHost } from '../panels/ModulePanelHost';
import { ToolsPanel } from '../panels/ToolsPanel';

type Tab = 'inspector' | 'layers' | 'module' | 'tools';

/** Contextual right-hand inspector stack. */
export function RightPanel() {
  const [tab, setTab] = useState<Tab>('inspector');
  const collapsed = useUIStore((state) => state.rightCollapsed);
  const width = useUIStore((state) => state.rightWidth);
  const toggleRight = useUIStore((state) => state.toggleRight);
  const activeModule = useUIStore((state) => state.activeModule);

  if (collapsed) return null;

  return (
    <aside
      aria-label="Inspector"
      className="orb-scroll relative z-20 flex shrink-0 flex-col gap-2 overflow-y-auto border-l border-line bg-space/90 p-2"
      style={{ width }}
    >
      <div className="flex items-center gap-1 rounded-[3px] border border-line bg-panel p-0.5">
        {(
          [
            ['inspector', 'Inspect', <SlidersHorizontal key="i" size={13} />],
            ['layers', 'Layers', <Layers3 key="l" size={13} />],
            ['module', moduleLabel(activeModule), <PanelRightClose key="m" size={13} />],
            ['tools', 'Tools', <Wrench key="t" size={13} />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[2px] px-1.5 py-1.5 text-[10px] transition-colors ${
              tab === id ? 'bg-accent/14 text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {icon}
            <span className="truncate">{label}</span>
          </button>
        ))}
        <IconButton label="Collapse inspector" icon={<PanelRightClose size={13} />} size="sm" onClick={toggleRight} />
      </div>

      {tab === 'inspector' && (
        <>
          <BodyInspector />
          <ModulePanelHost compact />
        </>
      )}
      {tab === 'layers' && <LayerControls />}
      {tab === 'module' && <ModulePanelHost />}
      {tab === 'tools' && <ToolsPanel />}
    </aside>
  );
}
