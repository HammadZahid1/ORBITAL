import { Compass, Focus } from 'lucide-react';
import { useSimulationStore } from '../../state/simulationStore';
import { Badge, Button, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';
import { ObjectList } from './ObjectList';

/** Universe explorer quick panel: selection, focus and system overview. */
export function ExplorerPanel() {
  const universe = useSimulationStore((state) => state.universe);
  const scenarioId = useSimulationStore((state) => state.scenarioId);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const requestCamera = useSimulationStore((state) => state.requestCamera);
  const playing = useSimulationStore((state) => state.playing);

  return (
    <Panel>
      <PanelHeader
        title="Universe Explorer"
        subtitle={universe.name}
        icon={<Compass size={14} />}
        actions={<Badge tone={playing ? 'success' : 'neutral'}>{playing ? 'running' : 'paused'}</Badge>}
      />
      <PanelSection title="Bodies" dense>
        <ObjectList />
      </PanelSection>
      <PanelSection title="System" dense>
        <PropertyRow label="Scenario" value={scenarioId} />
        <PropertyRow label="Bodies" value={universe.bodies.length} />
        <PropertyRow label="Integrator" value={universe.settings.integrator} />
        <PropertyRow label="Softening" value={`${universe.settings.softening.toExponential(1)} m`} />
      </PanelSection>
      <PanelSection title="Focus" dense>
        <Button
          size="sm"
          icon={<Focus size={13} />}
          disabled={!selectedId}
          onClick={() => requestCamera()}
          className="w-full"
        >
          Focus selected body
        </Button>
      </PanelSection>
    </Panel>
  );
}
