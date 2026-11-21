# Performance

ORBITAL runs the solver, analytics, and a Three.js viewport in one browser tab. The design keeps physics state in typed arrays and limits how often React re-renders, but the force calculation is still pairwise and grows quickly with body count.

## Solver cost

[`src/engine/physics/gravity.ts`](../src/engine/physics/gravity.ts) evaluates each unordered pair once and applies equal-and-opposite accelerations, so force cost is O(N²). [`PhysicsWorld`](../src/engine/physics/world.ts) stores masses, radii, positions, velocities, accelerations, lock anchors, and RK4 scratch space in `Float64Array`s or flag arrays. A normal step allocates no new physics arrays.

Energy and potential diagnostics in [`src/engine/energy/energy.ts`](../src/engine/energy/energy.ts) also perform pairwise potential sums. Analytics sampling therefore becomes more expensive for large systems. Forecast tools clone the whole world and propagate it forward; a long horizon or many forecast targets can dominate CPU time.

## Frame loop and caps

[`useSimulationLoop`](../src/hooks/useSimulationLoop.ts) runs on `requestAnimationFrame`, clamps the real delta to 0.25 s, marks frame timing, calls `tick`, and samples analytics roughly every 160 ms. `tick` calls `engine.advance` and records a trajectory sample only when steps were executed.

`SimulationClock.simulatedDelta` also clamps to 0.25 s and multiplies by user `speed` and universe `timeScale`. `SimulationEngine.advance` then executes at most `maxStepsPerFrame = 32` fixed steps. If the requested step count exceeds 32, the clock's `elapsed` time still advances by the full simulated delta and the engine sets `world.time = clock.elapsed` after each executed step. The displayed time can therefore outrun the integrated state at extreme speed or tiny timestep settings. This is a deliberate stall/throughput guard, not a conservative substepping strategy.

The frame cap protects responsiveness but changes accuracy: lowering the timestep improves resolution only if the engine can execute the required steps. The [Integrators](integrators.md) page describes how methods respond differently to discretization error.

## React and buffer throttling

[`src/state/simulationStore.ts`](../src/state/simulationStore.ts) refreshes `simTime`, `steps`, and `frame` no more often than every 80 ms. Scene components read `engine.world` directly each frame with `useFrame` and use the throttled `frame` counter mainly to rebuild derived geometry.

The trajectory recorder starts with capacity 400 points per body, and the analytics recorder keeps 600 samples. Both are bounded ring/history buffers. `TrajectoryLines` further limits drawn points using `performance.trailLength`.

## Quality presets

`setQuality` in [`src/state/uiStore.ts`](../src/state/uiStore.ts) writes these presets:

| Preset | `particleDensity` | `maxAsteroids` | `trailLength` | `pixelRatioCap` | `shadows` |
| --- | --- | --- | --- | --- | --- |
| `low` | 0.2 | 60 | 80 | 1 | false |
| `balanced` | 0.6 | 200 | 240 | 1.5 | false |
| `high` | 1 | 500 | 500 | 2 | true |
| `custom` | unchanged | unchanged | unchanged | unchanged | unchanged |

Wired effects:

- `pixelRatioCap` bounds the R3F `Canvas` device pixel ratio in [`SpaceScene.tsx`](../src/components/celestial/SpaceScene.tsx), which also renders `AdaptiveDpr`.
- `particleDensity` controls the deterministic decorative star count in [`Starfield.tsx`](../src/components/celestial/Starfield.tsx).
- `maxAsteroids` caps the decorative instanced swarm in [`AsteroidBelt.tsx`](../src/components/celestial/AsteroidBelt.tsx) at 480.
- `trailLength` limits rendered historical trail points.
- `shadows` is read from the store during `SpaceScene` render and passed to `Canvas`; toggling it alone does not subscribe that component to a re-render, so it may require another state change to take effect.
- `settings.reduceMotion` disables antialias at Canvas creation and applies a CSS class that suppresses animations; see [Controls and accessibility](controls-and-accessibility.md).

## Stored but unwired knobs

Several performance-related values exist in types, defaults, settings UI, or monitors but are not applied:

- `performance.adaptiveQuality` is toggled in Settings but never read by the renderer.
- `performance.targetFps` is stored in the schema but has no control and no consumer.
- `performanceMonitor.qualityMultiplier` is computed from a 60-frame average (0.65 below 35 fps, 0.85 below 50 fps, otherwise 1) but is not used to adjust quality.
- `panelAnimations` is stored and toggled but does not control any animation.
- `prefersReducedMotion()` in the UI store is exported but not called by the runtime; CSS media rules and the separate `reduceMotion` setting provide the actual behaviour.

Treat these as future extension hooks, not working performance controls.

## Practical guidance

For large N-body experiments, start with a low quality preset, disable decorative layers, increase the timestep gradually, and compare conservation readings in the Gravity Lab. Remember that collisions and close encounters can make a stable-looking system expensive or chaotic. For repeatable comparisons, load the scenario fresh rather than switching integrators mid-run.

Continue with [Analysis and diagnostics](analysis-and-diagnostics.md) or [Scientific limitations](scientific-limitations.md).
