import { beforeEach, describe, expect, it } from 'vitest';
import { getScenario } from '../scenarios/registry';
import { useSimulationStore, engine } from '../state/simulationStore';
import { useUIStore } from '../state/uiStore';
import { createBody } from '../data/bodyFactory';

describe('simulation state store', () => {
  beforeEach(() => {
    useSimulationStore.getState().loadScenario(getScenario('solar-system')!);
    useSimulationStore.getState().setPlaying(false);
  });

  it('loads scenarios and resets the simulation clock', () => {
    useSimulationStore.getState().stepOnce();
    expect(useSimulationStore.getState().simTime).toBeGreaterThan(0);
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().simTime).toBe(0);
    expect(engine.world.steps).toBe(0);
  });

  it('selects bodies and changes simulation controls', () => {
    const store = useSimulationStore.getState();
    store.setSelected('sun');
    expect(useSimulationStore.getState().selectedId).toBe('sun');
    store.setSpeed(5);
    store.setIntegrator('rk4');
    store.setTimestep(120);
    expect(useSimulationStore.getState().speed).toBe(5);
    expect(useSimulationStore.getState().integrator).toBe('rk4');
    expect(engine.options.timestep).toBe(120);
  });

  it('adds, edits, duplicates and removes bodies', () => {
    const store = useSimulationStore.getState();
    const initial = store.bodies.length;
    const body = createBody({ name: 'Test Body', type: 'asteroid' });
    store.addBody(body);
    expect(useSimulationStore.getState().bodies).toHaveLength(initial + 1);
    store.updatePhysical(body.id, { mass: 42 });
    expect(useSimulationStore.getState().bodies.find((item) => item.id === body.id)?.physical.mass).toBe(42);
    store.updateVisual(body.id, { color: '#ff0000' });
    expect(useSimulationStore.getState().bodies.find((item) => item.id === body.id)?.visual.color).toBe('#ff0000');
    store.duplicate(body.id);
    expect(useSimulationStore.getState().bodies).toHaveLength(initial + 2);
    store.removeBody(body.id);
    expect(useSimulationStore.getState().bodies).toHaveLength(initial + 1);
  });

  it('manages UI layers, modules and notifications', () => {
    const ui = useUIStore.getState();
    ui.setModule('gravity');
    expect(useUIStore.getState().activeModule).toBe('gravity');
    const before = useUIStore.getState().layers.grid.visible;
    ui.toggleLayer('grid');
    expect(useUIStore.getState().layers.grid.visible).toBe(!before);
    ui.notify('Test message', 'success');
    expect(useUIStore.getState().notifications.at(-1)?.message).toBe('Test message');
    ui.setQuality('low');
    expect(useUIStore.getState().settings.performance.quality).toBe('low');
  });
});
