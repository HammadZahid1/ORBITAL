# Integrators

The solver advances a fixed-size state vector with one of four interchangeable methods. The contract is [`src/engine/integrators/types.ts`](../src/engine/integrators/types.ts): an integrator has an `id`, labels, a description, a nominal `order`, a metadata `evaluations` count, and a `step(world, dt, acceleration)` function. The registry and display order live in [`src/engine/integrators/index.ts`](../src/engine/integrators/index.ts).

## Available methods

| ID | Label | Order | Metadata force evaluations | Character |
| --- | --- | --- | --- | --- |
| `euler` | Explicit Euler | 1 | 1 | Non-symplectic; best for demonstrating drift. |
| `semi-implicit-euler` | Semi-implicit Euler | 1 | 1 | Symplectic; bounded energy error for stable orbits. |
| `velocity-verlet` | Velocity Verlet | 2 | 1 | Default; second-order symplectic. |
| `rk4` | Runge–Kutta 4 | 4 | 4 | Accurate over short spans; non-symplectic. |

`getIntegrator` falls back to Velocity Verlet for an unknown ID. `INTEGRATOR_LIST` orders the options shown in the Gravity Lab: Velocity Verlet, semi-implicit Euler, RK4, explicit Euler.

## What each step does

Explicit Euler in [`euler.ts`](../src/engine/integrators/euler.ts) evaluates acceleration once, then updates position with the old velocity and velocity with the old acceleration: `x += v·dt`, `v += a·dt`. It is first order and not symplectic, so orbital energy typically drifts in one direction.

Semi-implicit Euler in [`semiImplicitEuler.ts`](../src/engine/integrators/semiImplicitEuler.ts) also evaluates once but updates velocity before position. That small change makes the method symplectic: energy error stays bounded for well-resolved orbits, although the formal order is still one.

Velocity Verlet in [`velocityVerlet.ts`](../src/engine/integrators/velocityVerlet.ts) uses `world.accPrev` to retain the acceleration from the previous step. It advances position with `v·dt + ½a·dt²`, evaluates the new acceleration, and finishes the velocity update with `½(a_old + a_new)·dt`. The metadata says one force evaluation per step because one force result is reused. After initialisation, the steady-state implementation calls `acceleration` once per step; the first call after a reset or body rebuild calls it twice to seed `accPrev`.

RK4 in [`rk4.ts`](../src/engine/integrators/rk4.ts) applies the classical four-stage Runge–Kutta scheme to `(x, v)`. It uses preallocated scratch buffers in `world.rk4`. The metadata reports four force evaluations; the implementation calls `acceleration` four times for the stages and once more at the final state so the world keeps the current acceleration, which is five calls per step in practice.

## How steps are orchestrated

[`SimulationEngine.step`](../src/engine/simulation/engine.ts) does more than call the integrator:

1. Select the method from `engine.integrator`.
2. Run `integrator.step(world, dt, computeAccelerations)`.
3. Restore locked-body positions and velocities.
4. Increment `world.time`, `world.steps`, and `clock.steps`.
5. Detect overlaps and resolve collisions when enabled.

`advance(realDeltaSeconds)` converts a real frame delta into simulated seconds, then executes at most `maxStepsPerFrame` fixed steps (32 by default). `stepBackward` is not an inverse integrator: it negates all velocities, takes one forward step, and negates velocities again. It is a teaching aid and is not exact for dissipative events or collisions.

## Choosing a method

Use Velocity Verlet for normal exploration and long-running orbital demonstrations. Use semi-implicit Euler when a first-order symplectic comparison is useful. Use RK4 for short, high-accuracy segments where secular drift over many orbits is acceptable. Use explicit Euler when the goal is to show how numerical energy drift appears. The [Orbital Stability experiment](scenarios.md) is well suited to side-by-side comparisons.

Changing the integrator switches the method used on the next step; it does not rewind or re-baseline the simulation. A reload or reset is the cleanest way to compare methods from identical initial conditions.

## Accuracy boundaries

All four methods integrate the same softened Newtonian point-mass model described in [Physics model](physics-model.md). None of them accounts for general relativity, tides, drag, or extended-body effects. Accuracy is also limited by the chosen timestep: a high-order method with an oversized step is not automatically better. See [Performance](performance.md) for the frame-step cap and its effect on simulated time, and [Scientific limitations](scientific-limitations.md) for the model's scope.

Continue with [Coordinates and scales](coordinates-and-scales.md) or [Testing](testing.md).
