# Testing

The repository uses [Vitest](https://vitest.dev/) with a jsdom environment. There is no separate test directory outside `src`; all suites live in [`src/tests/`](../src/tests/). At the time of writing there are 21 `*.test.ts` files containing roughly 147 `it` cases.

## Commands and configuration

Scripts are defined in [`package.json`](../package.json):

| Command | Purpose |
| --- | --- |
| `npm test` | Run the whole suite once with `vitest run`. |
| `npm run test:watch` | Start Vitest in watch mode during development. |
| `npm run typecheck` | Run TypeScript project checking in no-emit mode. |
| `npm run lint` | Run ESLint. |

[`vite.config.ts`](../vite.config.ts) holds the test configuration: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/tests/setup.ts'` and `css: false`. The setup file imports `@testing-library/jest-dom/vitest` so DOM matchers are available. The build configuration also defines manual chunks for Three.js and Recharts, but tests do not depend on a production build. No coverage provider or coverage threshold is configured.

## Suite layout

The tests mostly target pure engine modules and module-level stores.

| Area | Representative files | Coverage focus |
| --- | --- | --- |
| Math and constants | [`vector.test.ts`](../src/tests/vector.test.ts), [`numeric.test.ts`](../src/tests/numeric.test.ts) | Vector algebra, clamping, deterministic hashing/random streams and formatting. |
| Gravity and world state | [`gravity.test.ts`](../src/tests/gravity.test.ts), [`limits.test.ts`](../src/tests/limits.test.ts), [`barycenter.test.ts`](../src/tests/barycenter.test.ts) | Softened inverse-square forces, equal-and-opposite pairs, field sampling, centre of mass and simple limit formulas. |
| Integrators and clock | [`integrators.test.ts`](../src/tests/integrators.test.ts), [`simulation.test.ts`](../src/tests/simulation.test.ts) | Registration metadata, bounded circular orbits, Euler drift comparison, fixed steps, locked bodies, reset and delta clamping. |
| Orbits and trajectories | [`orbits.test.ts`](../src/tests/orbits.test.ts), [`trajectory.test.ts`](../src/tests/trajectory.test.ts), [`transfer.test.ts`](../src/tests/transfer.test.ts), [`closeApproach.test.ts`](../src/tests/closeApproach.test.ts) | Element conversions, ellipse sampling, ring-buffer history, non-mutating forecasts, Hohmann geometry and sampled close approaches. |
| Energy and stability | [`energy.test.ts`](../src/tests/energy.test.ts), [`stability.test.ts`](../src/tests/stability.test.ts) | Energy/momentum sums, drift reporting, empty systems and injected changes. |
| Analysis helpers | [`analytics.test.ts`](../src/tests/analytics.test.ts), [`analysisExtra.test.ts`](../src/tests/analysisExtra.test.ts) | Bounded sample recording, performance monitor sanity, exported helper surface, finite-input validation and physical-domain errors. |
| Collisions | [`collision.test.ts`](../src/tests/collision.test.ts) | Detection gating, elastic/inelastic impulses, merge conservation and coincident-body handling. |
| Bodies, scenarios and generation | [`bodyFactory.test.ts`](../src/tests/bodyFactory.test.ts), [`scenarios.test.ts`](../src/tests/scenarios.test.ts), [`generator.test.ts`](../src/tests/generator.test.ts) | Default visuals, element-derived initial state, registry contents, cloning and seed reproducibility. |
| State and persistence | [`state.test.ts`](../src/tests/state.test.ts), [`persistence.test.ts`](../src/tests/persistence.test.ts) | Store actions, layer toggles, localStorage round-trips, corrupt-data fallback and JSON validation. |

## Conventions

Tests import source modules directly rather than going through the application entry point. Suite files use `describe`, `it` and `expect` from Vitest, sometimes imported explicitly and sometimes relying on `globals: true`.

Several suites construct `SimulationEngine` or `PhysicsWorld` instances directly with scenario bodies. Store tests reset shared module-level state in `beforeEach` by loading the solar-system scenario and pausing playback; persistence tests clear `window.localStorage` before each case. This matters because [`src/state/simulationStore.ts`](../src/state/simulationStore.ts) and [`src/state/uiStore.ts`](../src/state/uiStore.ts) are singletons created at import time.

Numeric assertions often use tolerances (`toBeCloseTo`) and compare scaling behaviour rather than ephemeris values. That matches the project's educational scope: the tests verify internal consistency, determinism and safe handling of invalid inputs, not agreement with an external observatory dataset.

## What is not covered

No React component render tests were found. The testing-library packages and DOM matchers are configured, but the current suites do not mount `App`, panels or the R3F `Canvas`. Visual layer composition, browser downloads, keyboard shortcuts and camera interaction are therefore validated by inspection and manual use rather than automated UI tests. Performance assertions are limited to finite FPS/quality values; there are no frame-time budgets or visual regression snapshots.

For extension work, add a focused test beside the relevant area in `src/tests/`, following the existing naming convention `<area>.test.ts`. If a new integrator, scenario, layer or storage format is added, see [Contributing and extending](contributing-and-extending.md) for the registries and validation functions that also need updating.
