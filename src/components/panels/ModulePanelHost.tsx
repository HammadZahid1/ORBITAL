import { MODULE_BY_ID } from '../../state/moduleRegistry';
import { useUIStore } from '../../state/uiStore';
import { Panel, PanelHeader, PanelSection } from '../ui';

/** Hosts the contextual tool panel for the active workspace. */
export function ModulePanelHost({ compact = false }: { compact?: boolean }) {
  const activeModule = useUIStore((state) => state.activeModule);
  const module = MODULE_BY_ID.get(activeModule);

  return (
    <Panel>
      <PanelHeader title={module?.label ?? activeModule} subtitle={compact ? 'Quick tools' : 'Workspace tools'} />
      <PanelSection title="Overview" dense>
        <p className="text-[10px] leading-relaxed text-muted">{module?.description}</p>
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          This workspace shares the same live solver as the viewport. Changes to time, integrator and bodies apply
          immediately across the application.
        </p>
      </PanelSection>
    </Panel>
  );
}
