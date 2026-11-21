# Architecture

ORBITAL is a client-only React application. The physics engine is not a React component: it is a pair of module-level singletons that advance in place, while React renders throttled snapshots and the Three.js scene reads solver buffers directly on every frame.

## Layers

```
main.tsx → App.tsx → AppShell.tsx
                         ├─ hooks/useSimulationLoop.ts ── requestAnimationFrame
                         ├─ hooks/useKeyboardShortcuts.ts
                         ├─ components/layout/* ── header, nav, timeline, dialogs
                         ├─ components/celestial/SpaceScene.tsx ── Three.js Canvas
                         └─ components/panels/* ── workspace tools

state/simulationStore.ts ── engine + recorder singletons
state/uiStore.ts ── layout, layers, settings, notifications
scenarios/, generators/, data/ ── universe construction
engine/ ── physics, integrators, orbits, analysis, trajectories
storage/ ── validation and local persistence
```

### 1. Entry and shell

[`src/main.tsx`](../src/main.tsx) mounts [`src/App.tsx`](../src/App.tsx), which renders [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx). The shell installs the frame loop and keyboard map, then lays out the header, left navigation, 3D viewport, right inspector, bottom drawer and modal overlays.

### 2. State layer

Two Zustand stores are created at module scope:

- [`src/state/simulationStore.ts`](../src/state/simulationStore.ts) owns the `SimulationEngine`, a `TrajectoryRecorder`, the active `Universe`, selection/transport state and all body edit actions. It creates the engine from the built-in solar-system scenario when the module is first imported.
- [`src/state/uiStore.ts`](../src/state/uiStore.ts) owns the active module, panel collapse state, layer configuration, `AppSettings`, notifications, comparison IDs and scale mode. Settings are written to `localStorage` on every `updateSettings` call.

Supporting module-level objects: `analytics` in [`src/state/analytics.ts`](../src/state/analytics.ts) and `performanceMonitor` in [`src/state/performanceMonitor.ts`](../src/state/performanceMonitor.ts).

### 3. Engine layer

[`SimulationEngine`](../src/engine/simulation/engine.ts) owns a [`PhysicsWorld`](../src/engine/physics/world.ts), a [`SimulationClock`](../src/engine/simulation/clock.ts) and collision/energy helpers. A step:

1. Calls the selected integrator with `computeAccelerations` from [`src/engine/physics/gravity.ts`](../src/engine/physics/gravity.ts).
2. Restores anchored positions/velocities for locked bodies.
3. Advances simulated time and the step counter.
4. Detects and resolves overlaps when collisions are enabled.

`syncWorldToBodies` copies solver positions, velocities and accelerations back into the `CelestialBody` objects so panels and exports see current state.

### 4. Presentation layer

[`src/components/celestial/SpaceScene.tsx`](../src/components/celestial/SpaceScene.tsx) creates the R3F `Canvas`. Each body mesh uses [`useLiveBodyTransform`](../src/hooks/useLiveBodyTransform.ts), which copies world positions into scene graph nodes inside `useFrame`; the solver never waits for React. Slow-changing UI (body list, inspector, panels) re-renders when the store's `frame` counter changes.

## Frame and state flow

1. [`useSimulationLoop`](../src/hooks/useSimulationLoop.ts) receives an animation-frame timestamp, clamps the real delta to 0.25 s and calls `tick(delta)`.
2. `tick` calls `engine.advance`, records a trajectory sample and samples analytics roughly every 160 ms.
3. The store updates `simTime`, `steps` and `frame` no more often than every 80 ms (`lastTick` guard), limiting React churn.
4. Scene components read `engine.world` directly and use `frame` only to rebuild expensive derived geometry such as orbit ellipses and trails.

The practical consequence: rendering is smooth while inspector numbers refresh at approximately 12 Hz. See [Performance](performance.md) for the solver step cap and its implications.

## Ownership rules

| Data | Owner | Reader |
| --- | --- | --- |
| `world.pos/vel/acc` typed arrays | `SimulationEngine` | 3D scene, charts, panels via `engine` |
| `Universe.bodies` definitions | Zustand store | Builder, lists, JSON export |
| Layer visibility/opacity | UI store | `SpaceScene` layer components |
| Solver options | Store fields mirrored into `engine.options` | Integrators and clock |
| Saved universes | `storage/universes.ts` | Saved panel |

`updateVisual` updates definition data without rebuilding the world. Physical or structural edits call `engine.setBodies`, which rebuilds typed arrays and transfers state by body ID when appropriate ([`transferWorldState`](../src/engine/physics/world.ts)).

## Boundaries and conventions

- **No backend.** All persistence goes through [`src/storage/localStorage.ts`](../src/storage/localStorage.ts); all downloads use object URLs in [`src/storage/download.ts`](../src/storage/download.ts) and [`src/storage/importExport.ts`](../src/storage/importExport.ts).
- **No external assets.** Surfaces, starfield and accretion visuals are inline GLSL; see [Rendering and visual layers](rendering-and-visual-layers.md).
- **SI internally.** Metres, kilograms and seconds are used by the solver; AU and years appear only in formatting and initial-condition construction.
- **Shared registries.** [`src/state/moduleRegistry.ts`](../src/state/moduleRegistry.ts) drives navigation, the command palette and help; [`src/scenarios/registry.ts`](../src/scenarios/registry.ts) drives the scenario strip and palette.

Continue with [Physics model](physics-model.md) and [Modules](modules.md).
