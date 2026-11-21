import { create } from 'zustand';
import type {
  BodyType,
  CelestialBody,
  CollisionMode,
  IntegratorId,
  Universe,
} from '../types/celestial';
import type { Vec3 } from '../types/vector';
import { energyBaseline } from '../engine/energy/stability';
import { isIntegratorId } from '../engine/integrators';
import { SimulationEngine } from '../engine/simulation/engine';
import { TrajectoryRecorder } from '../engine/trajectory/history';
import { createBody, duplicateBody } from '../data/bodyFactory';
import { getScenario } from '../scenarios/registry';
import type { Scenario } from '../scenarios/types';
import { DEFAULT_SPEED } from './constants';

export interface CameraRequest {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  nonce: number;
}

const initialUniverse = structuredClone(getScenario('solar-system')!.universe);
export const engine = new SimulationEngine(initialUniverse.bodies, initialUniverse.settings);
export const recorder = new TrajectoryRecorder(400);
recorder.sync(engine.world);
recorder.record(engine.world, true);

interface SimulationState {
  universe: Universe;
  bodies: CelestialBody[];
  selectedId: string | null;
  hoveredId: string | null;
  playing: boolean;
  speed: number;
  timestep: number;
  timeScale: number;
  integrator: IntegratorId;
  softening: number;
  collisionMode: CollisionMode;
  collisionsEnabled: boolean;
  simTime: number;
  initialEnergy: number;
  frame: number;
  steps: number;
  cameraRequest: CameraRequest | null;
  scenarioId: string;
  lastTick: number;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setTimestep: (timestep: number) => void;
  setTimeScale: (scale: number) => void;
  setIntegrator: (integrator: IntegratorId) => void;
  setSoftening: (softening: number) => void;
  setCollisionMode: (mode: CollisionMode) => void;
  setCollisionsEnabled: (enabled: boolean) => void;
  loadUniverse: (universe: Universe, scenarioId?: string) => void;
  loadScenario: (scenario: Scenario) => void;
  reset: () => void;
  stepOnce: () => void;
  stepBack: () => void;
  tick: (realDeltaSeconds: number) => void;
  addBody: (body: CelestialBody) => void;
  addBodyOfType: (type: BodyType) => CelestialBody;
  updateBody: (id: string, patch: Partial<CelestialBody>) => void;
  updatePhysical: (id: string, patch: Partial<CelestialBody['physical']>) => void;
  updateVisual: (id: string, patch: Partial<CelestialBody['visual']>) => void;
  removeBody: (id: string) => void;
  duplicate: (id: string) => void;
  renameUniverse: (name: string) => void;
  requestCamera: (position?: [number, number, number], distance?: number) => void;
  refresh: () => void;
}

function applyEngineOptions(get: () => SimulationState): void {
  const state = get();
  engine.options.timestep = Math.max(state.timestep, 1e-6);
  engine.options.softening = Math.max(state.softening, 0);
  engine.options.collisionMode = state.collisionMode;
  engine.options.collisionsEnabled = state.collisionsEnabled;
  engine.world.softening = Math.max(state.softening, 0);
  engine.world.collisionMode = state.collisionMode;
  engine.world.collisionsEnabled = state.collisionsEnabled;
  engine.clock.setTimeScale(state.timeScale);
  engine.clock.setSpeed(state.speed);
  engine.integrator = state.integrator;
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  universe: initialUniverse,
  bodies: initialUniverse.bodies,
  selectedId: 'earth',
  hoveredId: null,
  playing: false,
  speed: DEFAULT_SPEED,
  timestep: initialUniverse.settings.timestep,
  timeScale: initialUniverse.settings.timeScale,
  integrator: isIntegratorId(initialUniverse.settings.integrator)
    ? initialUniverse.settings.integrator
    : 'velocity-verlet',
  softening: initialUniverse.settings.softening,
  collisionMode: initialUniverse.settings.collisionMode,
  collisionsEnabled: initialUniverse.settings.collisionsEnabled,
  simTime: 0,
  initialEnergy: energyBaseline(engine.world),
  frame: 0,
  steps: 0,
  cameraRequest: null,
  scenarioId: 'solar-system',
  lastTick: 0,

  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setPlaying: (playing) => {
    engine.clock.running = playing;
    set({ playing });
  },
  togglePlaying: () => get().setPlaying(!get().playing),
  setSpeed: (speed) => {
    const safe = Math.max(0, Math.min(1000, speed));
    engine.clock.setSpeed(safe);
    set({ speed: safe });
  },
  setTimestep: (timestep) => {
    const safe = Math.max(1e-6, timestep);
    set({ timestep: safe });
    applyEngineOptions(get);
  },
  setTimeScale: (scale) => {
    const safe = Math.max(1e-6, scale);
    set({ timeScale: safe });
    applyEngineOptions(get);
  },
  setIntegrator: (integrator) => {
    set({ integrator });
    applyEngineOptions(get);
  },
  setSoftening: (softening) => {
    set({ softening: Math.max(0, softening) });
    applyEngineOptions(get);
  },
  setCollisionMode: (mode) => {
    set({ collisionMode: mode });
    applyEngineOptions(get);
  },
  setCollisionsEnabled: (enabled) => {
    set({ collisionsEnabled: enabled });
    applyEngineOptions(get);
  },

  loadUniverse: (universe, scenarioId = 'custom') => {
    const cloned = structuredClone(universe);
    engine.reset(cloned.bodies);
    recorder.reset();
    recorder.sync(engine.world);
    recorder.record(engine.world, true);
    set({
      universe: cloned,
      bodies: cloned.bodies,
      selectedId: cloned.bodies[0]?.id ?? null,
      hoveredId: null,
      simTime: 0,
      initialEnergy: energyBaseline(engine.world),
      steps: 0,
      frame: get().frame + 1,
      scenarioId,
      timestep: cloned.settings.timestep,
      timeScale: cloned.settings.timeScale,
      integrator: isIntegratorId(cloned.settings.integrator) ? cloned.settings.integrator : 'velocity-verlet',
      softening: cloned.settings.softening,
      collisionMode: cloned.settings.collisionMode,
      collisionsEnabled: cloned.settings.collisionsEnabled,
    });
    applyEngineOptions(get);
  },
  loadScenario: (scenario) => {
    get().loadUniverse(scenario.universe, scenario.id);
    set({
      cameraRequest: {
        position: scenario.camera.position,
        target: scenario.camera.target,
        distance: scenario.camera.suggestedDistance,
        nonce: Date.now(),
      },
    });
  },
  reset: () => {
    engine.reset(get().bodies);
    recorder.reset();
    recorder.record(engine.world, true);
    set({ simTime: 0, initialEnergy: energyBaseline(engine.world), steps: 0, frame: get().frame + 1 });
  },
  stepOnce: () => {
    engine.step();
    engine.world.time = engine.clock.elapsed + engine.options.timestep;
    engine.clock.elapsed += engine.options.timestep;
    recorder.record(engine.world, true);
    set({ simTime: engine.clock.elapsed, steps: engine.world.steps, frame: get().frame + 1 });
  },
  stepBack: () => {
    engine.stepBackward();
    recorder.record(engine.world, true);
    set({ simTime: engine.clock.elapsed, steps: engine.world.steps, frame: get().frame + 1 });
  },
  tick: (realDeltaSeconds) => {
    const executed = engine.advance(realDeltaSeconds);
    if (executed === 0) return;
    recorder.record(engine.world);
    const now = performance.now();
    if (now - get().lastTick < 80) return;
    set({
      simTime: engine.clock.elapsed,
      steps: engine.world.steps,
      frame: get().frame + 1,
      lastTick: now,
    });
  },

  addBody: (body) => {
    const bodies = [...get().bodies, body];
    set({ bodies, universe: { ...get().universe, bodies, updatedAt: Date.now() } });
    engine.setBodies(bodies, get().playing);
    recorder.sync(engine.world);
    set({ initialEnergy: energyBaseline(engine.world) });
  },
  addBodyOfType: (type) => {
    const body = createBody({ name: `New ${type}`, type });
    get().addBody(body);
    set({ selectedId: body.id });
    return body;
  },
  updateBody: (id, patch) => {
    const bodies = get().bodies.map((body) => (body.id === id ? { ...body, ...patch } : body));
    set({ bodies, universe: { ...get().universe, bodies, updatedAt: Date.now() } });
    engine.setBodies(bodies, get().playing);
  },
  updatePhysical: (id, patch) => {
    const bodies = get().bodies.map((body) =>
      body.id === id ? { ...body, physical: { ...body.physical, ...patch } } : body,
    );
    set({ bodies, universe: { ...get().universe, bodies, updatedAt: Date.now() } });
    engine.setBodies(bodies, get().playing);
    set({ initialEnergy: energyBaseline(engine.world) });
  },
  updateVisual: (id, patch) => {
    const bodies = get().bodies.map((body) =>
      body.id === id ? { ...body, visual: { ...body.visual, ...patch } } : body,
    );
    set({ bodies, universe: { ...get().universe, bodies, updatedAt: Date.now() } });
  },
  removeBody: (id) => {
    const bodies = get().bodies.filter((body) => body.id !== id);
    set({
      bodies,
      universe: { ...get().universe, bodies, updatedAt: Date.now() },
      selectedId: get().selectedId === id ? (bodies[0]?.id ?? null) : get().selectedId,
    });
    engine.setBodies(bodies, false);
    recorder.unregister(id);
    set({ initialEnergy: energyBaseline(engine.world) });
  },
  duplicate: (id) => {
    const source = get().bodies.find((body) => body.id === id);
    if (!source) return;
    get().addBody(duplicateBody(source));
  },
  renameUniverse: (name) => {
    set({ universe: { ...get().universe, name, updatedAt: Date.now() } });
  },
  requestCamera: (position, distance) => {
    const selected = get().bodies.find((body) => body.id === get().selectedId);
    const target: [number, number, number] = selected
      ? [selected.physical.position.x, selected.physical.position.y, selected.physical.position.z]
      : [0, 0, 0];
    set({
      cameraRequest: {
        position: position ?? [target[2] * 0.45, Math.max(distance ?? 40, 1) * 0.5, Math.max(distance ?? 40, 1) * 0.8],
        target,
        distance: distance ?? 40,
        nonce: Date.now() + Math.random(),
      },
    });
  },
  refresh: () => set({ frame: get().frame + 1 }),
}));

export function selectedBody(): CelestialBody | undefined {
  const state = useSimulationStore.getState();
  return state.bodies.find((body) => body.id === state.selectedId);
}

export function setBodyPosition(id: string, position: Vec3): void {
  useSimulationStore.getState().updatePhysical(id, { position });
}
