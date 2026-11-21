# Scenarios

A scenario is a prepared universe plus a camera preset, educational note, category, and tags. [`src/scenarios/types.ts`](../src/scenarios/types.ts) defines the shape; [`src/scenarios/builders.ts`](../src/scenarios/builders.ts) supplies builders and `makeScenario`; [`src/scenarios/registry.ts`](../src/scenarios/registry.ts) exports the 14 built-ins, lookup helpers, and `DEFAULT_SCENARIO_ID = 'solar-system'`.

## What loading a scenario does

`makeScenario` wraps a body array in a `Universe` with `G`, integrator `velocity-verlet`, softening `1e5 m`, collision mode `none`, collisions disabled, and caller-supplied `timestep`/`timeScale`. Individual factories override those defaults where useful; the solar-system scenario, for example, forwards merge collisions from [`src/data/solarSystem.ts`](../src/data/solarSystem.ts).

`useSimulationStore.loadScenario` clones the universe, resets the engine and recorder, re-captures the energy baseline, applies universe settings, selects the first body, and issues a camera request using the scenario's scene-unit preset. Loading a scenario is therefore a fresh start, not a merge into the live state.

## Built-in systems

| ID | Category | Teaching intent and notable setup |
| --- | --- | --- |
| `solar-system` | Solar | Sun plus eight planets, Pluto, and the Moon from bundled approximate constants. Sun locked; 1-hour step, 3600× time scale, merge collisions enabled. |
| `earth-moon` | Orbital | Approximate Earth and Moon initial state with Earth locked. Uses a 600 s step and 600× time scale; the note explains that the pair does not orbit a shared barycentre until the lock is removed. |
| `circular-orbit` | Orbital | Locked solar-mass primary and Earth-mass orbiter at 1 AU with circular speed `√(μ/r)`; 1800 s step, 3600× time scale. |
| `elliptical-orbit` | Orbital | Same primary with eccentricity 0.55 starting near periapsis; demonstrates varying speed and approximately conserved angular momentum. |
| `escape-velocity` | Experiments | Probe launched at `1.05 × √(2μ/r)` from 1 AU; 7200 s step, 86400× time scale. |
| `binary-star` | Stellar | Two equal-mass stars with no locks, plus a circumbinary planet set up from the combined mass; 3600 s step, 7200× time scale. |
| `three-body` | Stellar | Equal-mass Lagrange-style triangle that is sensitive to integration error; 3600 s step, 7200× time scale. |
| `orbital-stability` | Experiments | Locked star and six test bodies on circular orbits at increasing radii; intended for integrator comparisons. 3600 s step, 86400× time scale. |
| `asteroid-belt` | Experiments | 48 mutually interacting asteroids with exaggerated masses so perturbations are visible; 21600 s step, 86400× time scale. |
| `comet-orbit` | Experiments | Highly eccentric (`e = 0.86`) inclined comet with a 500-point trail. The tail is a visual anti-starward line, not a plume simulation. |
| `moon-system` | Orbital | Locked Jupiter-like primary and three moons; illustrates Kepler's third law. 3600 s step, 21600× time scale. |
| `gravitational-interaction` | Experiments | Two initially unbound planet-mass bodies deflect each other during a flyby; momentum conservation despite changing speeds. 3600 s step, 86400× time scale. |
| `black-hole` | Extreme | Locked `4e36 kg` body plus one accretion particle; visual lensing/disc effects are heuristic and no general relativity is solved. |
| `custom-universe` | Custom | Empty sandbox with a 1-hour step and 3600× time scale, intended for the Universe Builder. |

`SCENARIOS.length` and `BUILT_IN_SCENARIO_COUNT` both report 14. `cloneScenario` uses `structuredClone`, and `validateScenario` only checks an ID, name, universe with a body array, and camera object—it is a shallow guard, not full schema validation.

## Initial-condition helpers

[`src/data/bodyFactory.ts`](../src/data/bodyFactory.ts) provides `createBody` for Cartesian state and `createOrbitalBody` for elements-to-state conversion. `duplicateBody` is used by the Builder and gives a new ID and suffixed name. `validateBody` checks name, positive mass and radius, finite vectors, and positive visual scale; it is separate from the stricter storage validator.

The solar-system data in [`src/data/solarSystem.ts`](../src/data/solarSystem.ts) is explicitly approximate: masses, radii, semimajor axes, eccentricities, and periods are bundled constants, not an ephemeris or observation fit. Visual radii and distances are compressed by the default scale mode, but the solver still uses SI positions and velocities.

## Adding a scenario

A new factory in `builders.ts` or `registry.ts` should call `makeScenario`, use stable string IDs, provide a camera preset in scene units, and add a short `educationalNotes` string. Add it to `scenarioFactories` so the scenario strip, command palette, and `SCENARIOS` registry pick it up. A matching test in [`src/tests/scenarios.test.ts`](../src/tests/scenarios.test.ts) is the convention. See [Contributing and extending](contributing-and-extending.md).

Continue with [Procedural generation](procedural-generation.md) or [Physics model](physics-model.md).
