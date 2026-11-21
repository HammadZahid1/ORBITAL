# Contributing and extending

This repository has no license file or formal contribution policy. This page is a practical map of the code as it exists: where to add things, which registries must stay in sync and which conventions the current implementation follows.

## Local workflow

Requires Node.js and npm. The standard commands are in [`package.json`](../package.json):

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run format
npm run build
```

`npm run dev` starts Vite; `npm run build` runs `tsc -b` before producing `dist/`. Tests use Vitest and jsdom; see [Testing](testing.md). The application has no backend and no asset pipeline beyond Vite/Tailwind, so an extension should not introduce network dependencies without an explicit design change.

## Repository conventions

- Source is TypeScript/React under `src/`. UI composition starts at [`src/main.tsx`](../src/main.tsx) → [`src/App.tsx`](../src/App.tsx) → [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx).
- State is module-level Zustand. [`simulationStore.ts`](../src/state/simulationStore.ts) owns the engine singleton; [`uiStore.ts`](../src/state/uiStore.ts) owns layout, settings and layers. Avoid putting mutable physics state into React state.
- Rendering reads solver arrays directly in `useFrame`. Use [`useLiveBodyTransform`](../src/hooks/useLiveBodyTransform.ts) for new body visuals rather than copying positions into React on every tick.
- SI units are used internally. AU, years and other display units are only for initial conditions and formatting; see [Coordinates and scales](coordinates-and-scales.md).
- Pure calculations belong under `src/engine/`. Presentation belongs under `src/components/`. Storage validation belongs under `src/storage/`.
- Styling uses Tailwind utility classes and small shared controls from [`src/components/ui/`](../src/components/ui/). Follow the compact panel style used by existing workspace panels.
- Keep educational caveats next to approximate formulas and visuals; see [Scientific limitations](scientific-limitations.md).

## Adding a scenario

1. Build bodies with [`createBody`](../src/data/bodyFactory.ts) or `createOrbitalBody`, or reuse a factory in [`src/scenarios/builders.ts`](../src/scenarios/builders.ts).
2. Wrap the universe with [`makeScenario`](../src/scenarios/builders.ts), supplying id, name, description, category, educational notes, timestep, timeScale and an optional scene-unit camera.
3. Add a factory to `scenarioFactories` in [`src/scenarios/registry.ts`](../src/scenarios/registry.ts) so the scenario appears in the bottom strip, command palette and saved-universe launcher.
4. Add assertions to [`src/tests/scenarios.test.ts`](../src/tests/scenarios.test.ts) and update [Scenarios](scenarios.md).

`makeScenario` currently supplies softening `1e5 m` and collision mode `none` unless overridden. Generated universes use different values; make the choice explicit when adding a scene.

## Adding an integrator

1. Extend `IntegratorId` in [`src/types/celestial.ts`](../src/types/celestial.ts).
2. Implement the [`Integrator`](../src/engine/integrators/types.ts) contract in a new file under `src/engine/integrators/`, using `PhysicsWorld` and the supplied acceleration function.
3. Register it in `INTEGRATORS` and `INTEGRATOR_LIST` in [`src/engine/integrators/index.ts`](../src/engine/integrators/index.ts). The list drives Gravity Lab and the timeline selector.
4. Update the separate hard-coded integrator check in [`src/storage/schema.ts`](../src/storage/schema.ts); import validation will otherwise reject saved universes using the new method.
5. Add drift/stability tests in [`src/tests/integrators.test.ts`](../src/tests/integrators.test.ts) and update [Integrators](integrators.md). Include accurate `order` and `evaluations` metadata: the existing RK4 metadata and actual call count differ, so check the implementation rather than copying it.

## Adding a workspace

1. Add the ID to `ModuleId` in [`src/types/celestial.ts`](../src/types/celestial.ts).
2. Add its label, description and group to `MODULES` in [`src/state/moduleRegistry.ts`](../src/state/moduleRegistry.ts). This registry feeds navigation, the command palette and help.
3. Create the panel under `src/components/panels/` and register the component in [`ModulePanelHost.tsx`](../src/components/panels/ModulePanelHost.tsx).
4. Add store actions only if the workspace needs new persistent state; update tests in [`src/tests/state.test.ts`](../src/tests/state.test.ts) and document the workspace in [Modules](modules.md).

## Adding a visual layer

Add a new `LayerId` in [`src/types/visualization.ts`](../src/types/visualization.ts), a default in `DEFAULT_LAYERS` in [`src/state/defaults.ts`](../src/state/defaults.ts), a row in [`LayerControls.tsx`](../src/components/panels/LayerControls.tsx) and a consumer in [`SpaceScene.tsx`](../src/components/celestial/SpaceScene.tsx) or a dedicated component. Actually read `visible`, `opacity` and `intensity` in that consumer; several existing layer fields are stored but unused. Update [Rendering and visual layers](rendering-and-visual-layers.md).

## Adding materials or analysis helpers

A new `MaterialPreset` must be added to the type in [`src/types/celestial.ts`](../src/types/celestial.ts), the definitions in [`src/data/materials.ts`](../src/data/materials.ts) and `STYLE_INDEX` in [`src/components/celestial/PlanetMaterial.tsx`](../src/components/celestial/PlanetMaterial.tsx); otherwise TypeScript or shader selection will fail. New finite-number astrophysics helpers belong in [`src/engine/analysis/astrophysics.ts`](../src/engine/analysis/astrophysics.ts) with validation and tests in [`analysisExtra.test.ts`](../src/tests/analysisExtra.test.ts).

## Changing settings or persisted data

Adding an `AppSettings` key requires updates to [`src/types/settings.ts`](../src/types/settings.ts) and `DEFAULT_SETTINGS` in [`src/state/defaults.ts`](../src/state/defaults.ts); `normaliseSettings` then merges it for older stored settings. Adding a serialized field may require `validateBodyShape` or `validateUniverseShape` in [`src/storage/schema.ts`](../src/storage/schema.ts). If the JSON layout itself changes, bump `SCHEMA_VERSION` and implement migration: `unwrap` currently rejects every other version.

Finally, wire any new option to a real consumer. Examples of stored-but-unwired options include `adaptiveQuality`, `targetFps`, `panelAnimations`, `units`, `precision`, `cameraDistance` and the `prefersReducedMotion` helper; do not add another without a caller.
