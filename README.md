# ORBITAL

**An interactive 3D universe simulator and computational physics workstation that runs entirely in the browser.**

ORBITAL combines a softened Newtonian N-body solver with a Three.js viewport and a set of analysis workspaces. Load an illustrative solar system, run a two-body experiment, generate a reproducible planetary system from a seed, then inspect energy drift, osculating orbital elements or predicted close approaches. Everything is local: there is no backend, no account, no telemetry, no external texture service and no external physics API.

> **Scientific honesty:** ORBITAL is an educational approximation, not a research ephemeris or a general-relativity code. Forces use softened point-mass Newtonian gravity; surfaces are procedural shaders; visual scales are frequently compressed. See [Scientific limitations](docs/scientific-limitations.md) before using any number for anything other than exploration and teaching.

## Features

- **Live N-body solver** — structure-of-arrays `Float64Array` state, pairwise softened gravity, four selectable integrators (explicit Euler, semi-implicit Euler, Velocity Verlet, RK4) and a fixed-step clock with single-step forward/backward controls.
- **14 built-in scenarios** — solar system, Earth–Moon, circular and elliptical orbits, escape velocity, binary and three-body stars, stability experiment, asteroid belt, comet, moon system, flyby, black-hole scene and an empty sandbox.
- **Universe Builder** — create bodies from name, type, material, mass, radius, semimajor axis and eccentricity; edit and duplicate existing bodies.
- **Procedural generator** — deterministic seed + system name + variation, with calm/balanced/chaotic presets.
- **Analysis workspaces** — conservation diagnostics, energy/orbit charts, osculating Keplerian elements, trajectory forecasts, Hohmann transfer estimates and close-approach searches.
- **Visual layers** — orbit ellipses, historical trails, velocity/acceleration arrows, gravitational field samples, barycentre marker, potential sheet, comet tails and decorative asteroid swarm, each independently toggleable.
- **Multiple distance scales** — exploration, logarithmic/compressed, educational and linear "realistic" drawing modes that never change the physics.
- **Local persistence and portable files** — universes and preferences in `localStorage`, versioned JSON import/export and analytics CSV export.
- **Keyboard-first workstation** — global shortcuts, `Ctrl/⌘+K` command palette, focus mode, reduced-motion support and labelled controls.

## Quick start

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). The solar-system scenario is loaded on startup with a 1-hour solver step and Velocity Verlet.

Try this first session:

1. Press **Space** to run the simulation; use the speed selector in the header to change the time multiplier.
2. Click a body in the viewport or in the object list to inspect its live state.
3. Open **Layers** in the inspector to reveal vector glyphs or the barycentre.
4. Open **Analysis** and export a CSV of measured energy and orbital samples.
5. Open **Saved Universes** to load another scenario, save locally, generate a seeded system or export JSON.

## Scripts

Defined in [`package.json`](package.json):

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check with `tsc -b` and produce `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Run the TypeScript project build in no-emit mode. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run format` | Run Prettier over the repository. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

## Architecture at a glance

```
src/
  engine/        Physics, integrators, coordinates, orbits, collisions, energy, analysis
  state/         Module-level Zustand stores, analytics and performance monitors
  data/          Body factory, material presets, bundled solar-system values
  scenarios/     Scenario definitions, builders and registry
  generators/    Seeded procedural universe generator
  storage/       Versioned envelopes, validation, localStorage, JSON/CSV export
  components/    App shell, layout, 3D scene and workspace panels
  hooks/         Animation loop, keyboard map, camera/follow, fullscreen
  types/         Shared TypeScript contracts
  tests/         Vitest suites for engine, state and storage
```

The solver lives in module-level singletons (`engine`, `recorder`, `analytics`) created in [`src/state/simulationStore.ts`](src/state/simulationStore.ts). React subscribes to throttled snapshots; the 3D scene reads solver arrays directly each frame. See [Architecture](docs/architecture.md) for the full data flow.

## Documentation

| Topic | Document |
| --- | --- |
| Documentation index | [docs/index.md](docs/index.md) |
| System architecture and data flow | [Architecture](docs/architecture.md) |
| Force law, world layout and collisions | [Physics model](docs/physics-model.md) |
| Solver methods and accuracy trade-offs | [Integrators](docs/integrators.md) |
| Units, Y-up frame and drawing scales | [Coordinates and scales](docs/coordinates-and-scales.md) |
| Workspaces and panel wiring | [Modules](docs/modules.md) |
| Prepared systems and their initial conditions | [Scenarios](docs/scenarios.md) |
| Seeded system generation | [Procedural generation](docs/procedural-generation.md) |
| Saves, validation, JSON and CSV | [Persistence and import/export](docs/persistence-and-io.md) |
| Render/solver cost and quality presets | [Performance](docs/performance.md) |
| Shortcuts, navigation and accessibility | [Controls and accessibility](docs/controls-and-accessibility.md) |
| Rendering pipeline and overlay layers | [Rendering and visual layers](docs/rendering-and-visual-layers.md) |
| Charts, conservation and forecasts | [Analysis and diagnostics](docs/analysis-and-diagnostics.md) |
| Test layout and conventions | [Testing](docs/testing.md) |
| Model scope and known caveats | [Scientific limitations](docs/scientific-limitations.md) |
| Types, units and file formats | [Data schema](docs/data-schema.md) |
| Development and extension points | [Contributing and extending](docs/contributing-and-extending.md) |

## What this project deliberately does not do

- No server, database, login, network fetch or remote configuration.
- No image, texture, font or model downloads: surfaces, starfield and accretion disc are generated in GLSL in [`src/components/celestial/PlanetMaterial.tsx`](src/components/celestial/PlanetMaterial.tsx) and neighbouring components.
- No ephemeris service, no JPL data files and no fit to observations; the bundled solar-system values in [`src/data/solarSystem.ts`](src/data/solarSystem.ts) are approximate constants used to create illustrative initial conditions.
- No relativistic dynamics, tidal deformation, atmospheric drag, radiation pressure, oblateness or fragmentation physics.

Licensing and contribution policy are not defined in this repository; this documentation describes the current implementation only.
