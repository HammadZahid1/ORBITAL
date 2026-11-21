import { useMemo } from 'react';
import { Orbit } from 'lucide-react';
import { AU, formatScientific } from '../../engine/numeric';
import { length3, sub3 } from '../../engine/vector';
import { getScenario } from '../../scenarios/registry';
import { useSimulationStore } from '../../state/simulationStore';
import { Badge, Button, Panel, PanelHeader, PanelSection, PropertyRow } from '../ui';
import { ObjectList } from './ObjectList';

/** Solar-system specific overview with heliocentric distances. */
export function SolarSystemPanel() {
  const bodies = useSimulationStore((state) => state.bodies);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const setSelected = useSimulationStore((state) => state.setSelected);
  const loadScenario = useSimulationStore((state) => state.loadScenario);

  const primary = bodies.find((body) => body.type === 'star') ?? bodies[0];
  const planets = useMemo(
    () =>
      bodies
        .filter((body) => body.type === 'planet' || body.type === 'dwarf')
        .map((body) => ({
          body,
          distance: primary ? length3(sub3(body.physical.position, primary.physical.position)) : 0,
        }))
        .sort((a, b) => a.distance - b.distance),
    [bodies, primary],
  );

  return (
    <Panel>
      <PanelHeader
        title="Solar System"
        subtitle={primary?.name ?? 'No primary star'}
        icon={<Orbit size={14} />}
        actions={<Badge tone="accent">{planets.length} planets</Badge>}
      />
      <PanelSection title="Planet distances" dense>
        <div className="orb-scroll max-h-56 space-y-0.5 overflow-y-auto">
          {planets.map(({ body, distance }) => (
            <button
              key={body.id}
              type="button"
              onClick={() => setSelected(body.id)}
              className={`flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left ${
                body.id === selectedId ? 'orb-selected-row' : 'orb-hover-row'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: body.visual.color }} />
              <span className="flex-1 truncate text-[10px] text-ink">{body.name}</span>
              <span className="orb-mono text-[9px] text-accent">{(distance / AU).toFixed(3)} AU</span>
            </button>
          ))}
          {planets.length === 0 && <div className="py-4 text-center text-[10px] text-faint">No planets loaded</div>}
        </div>
      </PanelSection>
      <PanelSection title="All objects" dense>
        <ObjectList />
      </PanelSection>
      <PanelSection title="Actions" dense>
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const scenario = getScenario('solar-system');
            if (scenario) loadScenario(scenario);
          }}
        >
          Reload solar system
        </Button>
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          Distances are computed from the live solver state. Visual scale modes do not affect these numbers.
        </p>
        <PropertyRow label="1 AU" value={`${formatScientific(AU, 4)} m`} />
      </PanelSection>
    </Panel>
  );
}
