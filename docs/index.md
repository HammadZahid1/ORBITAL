# ORBITAL documentation

This directory documents the implementation that actually exists in `M:\Orbital`. Every page links to real source paths; where the UI exposes a setting that is not yet wired into the renderer, the relevant page says so explicitly.

Start with the [project README](../README.md) for product overview, quick start and scripts.

## Foundation

- [Architecture](architecture.md) — layers, module-level stores, frame loop and React/solver boundary.
- [Physics model](physics-model.md) — softened Newtonian gravity, world memory layout, locked bodies and collisions.
- [Integrators](integrators.md) — the four solvers, their cost, accuracy and appropriate uses.
- [Coordinates and scales](coordinates-and-scales.md) — SI units, Y-up frame, scene mapping and camera behaviour.
- [Data schema](data-schema.md) — TypeScript contracts, units, enums and the JSON envelope.

## Product surfaces

- [Modules](modules.md) — the eleven workspaces and how panels are selected.
- [Scenarios](scenarios.md) — all fourteen prepared systems and their teaching intent.
- [Procedural generation](procedural-generation.md) — seed hashing, variation presets and generation limits.
- [Controls and accessibility](controls-and-accessibility.md) — shortcuts, pointer navigation and current accessibility support.
- [Rendering and visual layers](rendering-and-visual-layers.md) — scene composition and procedural visuals.
- [Analysis and diagnostics](analysis-and-diagnostics.md) — conservation charts, forecasts and CSV export.

## Operations

- [Persistence and import/export](persistence-and-io.md) — localStorage keys, validation and portable JSON.
- [Performance](performance.md) — O(N²) cost, frame caps, quality presets and unused knobs.
- [Testing](testing.md) — Vitest layout, conventions and what is covered.
- [Scientific limitations](scientific-limitations.md) — what the model omits and how to interpret results.
- [Contributing and extending](contributing-and-extending.md) — safe extension points and repository conventions.

## Source map

| Area | Entry point |
| --- | --- |
| App root | [`src/main.tsx`](../src/main.tsx), [`src/App.tsx`](../src/App.tsx) |
| Shell and layout | [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx) |
| Simulation engine | [`src/engine/simulation/engine.ts`](../src/engine/simulation/engine.ts) |
| Simulation store | [`src/state/simulationStore.ts`](../src/state/simulationStore.ts) |
| UI store | [`src/state/uiStore.ts`](../src/state/uiStore.ts) |
| Scenario registry | [`src/scenarios/registry.ts`](../src/scenarios/registry.ts) |
| Storage schema | [`src/storage/schema.ts`](../src/storage/schema.ts) |
| Test configuration | [`vite.config.ts`](../vite.config.ts) |
