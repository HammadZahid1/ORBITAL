# Scientific limitations

ORBITAL is an educational N-body simulator and physics workstation. It is useful for exploring orbital mechanics, numerical integration and conservation behaviour. It is not a research ephemeris, a mission-design tool or a general-relativity code. This page collects the caveats that matter most when interpreting numbers or visuals.

## The force law is softened Newtonian gravity

The solver uses pairwise point-mass gravity with a Plummer-style softening length: acceleration from body *j* is `G·mⱼ·r⃗ / (r² + ε²)^(3/2)`, with ε clamped to at least `1e-6 m`. The implementation is in [`src/engine/physics/gravity.ts`](../src/engine/physics/gravity.ts). Softening keeps forces finite at small separations; it is a numerical regularisation, not a model of extended bodies. Built-in scenarios made through `makeScenario` default to `1e5 m`, generated universes use `1e6 m`, and the UI slider can change the value. Different softening values produce different dynamics and potential energies, so conservation comparisons should keep it fixed.

There is no general relativity, post-Newtonian correction, radiation pressure, atmospheric drag, solar wind, oblateness (`J₂`), tidal deformation, mass transfer, fragmentation or shock heating. The black-hole scenario is a Newtonian massive point with a decorative accretion visual; [`BlackHole.tsx`](../src/components/celestial/BlackHole.tsx) does not lens light or solve horizon physics.

## Initial conditions are illustrative

The bundled solar-system values in [`src/data/solarSystem.ts`](../src/data/solarSystem.ts) are approximate constants used to build initial states. They are not JPL ephemerides, are not fitted to observations and do not include every real perturbation. Procedural systems from [`src/generators/universeGenerator.ts`](../src/generators/universeGenerator.ts) are deterministic for a given seed but explicitly described in code as not derived from survey data. See [Scenarios](scenarios.md) and [Procedural generation](procedural-generation.md).

## Numerical integration introduces error

Four fixed-step integrators are available; Velocity Verlet is the default. Explicit Euler drifts noticeably on orbital timescales, while symplectic and higher-order methods usually conserve energy better, but none is exact. See [Integrators](integrators.md). Energy diagnostics use the same softening as the force calculation in [`src/engine/energy/energy.ts`](../src/engine/energy/energy.ts), but reported drift still depends on timestep, softening, close encounters and body count.

The frame loop clamps real deltas to 0.25 s, and [`SimulationEngine.advance`](../src/engine/simulation/engine.ts) caps execution at 32 steps per frame. `SimulationClock.advance` adds the full requested simulated interval to `clock.elapsed` before the engine decides how many steps it can run. At extreme speed/timestep settings the displayed simulated time can therefore move ahead of the number of integrated steps. Reduce speed or timestep when precision matters.

`stepBack` works by reversing velocities, stepping forward and reversing again. It is a useful demonstration for smooth conservative systems, not a general time machine: collisions, locked-body constraints and accumulated floating-point error break exact reversibility.

## Collisions and locks are simplified

Collision detection is a geometric centre-distance test against the sum of radii. Responses in [`src/engine/collision/collision.ts`](../src/engine/collision/collision.ts) are rigid-sphere impulses (`elastic`, `inelastic`) or a volume-conserving `merge`. There is no deformation, spin coupling, cratering or fragment cloud. Extreme Physics uses a fixed density pair for its Roche estimate in [`ExtremePanel.tsx`](../src/components/panels/ExtremePanel.tsx).

A locked body is restored to its anchored position and velocity after every integrator step. That is useful for clean two-body demonstrations, but it represents an external constraint: momentum conservation for the whole displayed system no longer applies in the usual way, and the barycentre is forced rather than free.

## Analysis helpers are idealised formulas

[`src/engine/analysis/astrophysics.ts`](../src/engine/analysis/astrophysics.ts) validates inputs and returns finite values, but its formulas assume point masses, circular restricted three-body geometry, ideal Schwarzschild or special-relativistic settings, blackbody radiators and similar simplifications. The file says so in each helper's documentation. Not every helper has a UI control; when one does, the panel is presenting a teaching estimate, not a fit to a real object. Similar caution applies to the simpler helpers in [`src/engine/physics/limits.ts`](../src/engine/physics/limits.ts).

Trajectory forecasts clone the current world with collisions disabled and integrate it forward. Error grows with horizon length. Close approaches are the minimum among sampled forecast points, not a continuous optimisation. Hohmann transfers assume coplanar circular orbits and instantaneous impulses. Charts plot measured solver samples, not analytic truth. See [Analysis and diagnostics](analysis-and-diagnostics.md).

## Visuals are not measurements

Distances and radii are often compressed. `compressed` and `educational` scale modes change drawing only; `realistic` keeps linear positions but many bodies become sub-pixel. Surfaces, atmospheres, rings, starfield, comet tails, potential sheet and accretion disc are procedural GLSL or simple geometry with no external assets. The potential sheet in [`SpacetimeGrid.tsx`](../src/components/celestial/SpacetimeGrid.tsx) is a visual metaphor for Newtonian potential, not a curvature solution. Read numeric panels and exported samples for values; use the viewport for intuition.

## Practical rule

Use ORBITAL to ask "what happens under these simplified assumptions?". Do not use it to answer "what will this real spacecraft or planet do on a given date?". That question needs validated initial data, a higher-fidelity force model and an independent numerical validation workflow.
