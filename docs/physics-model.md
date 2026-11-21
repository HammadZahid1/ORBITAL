# Physics model

ORBITAL integrates **softened Newtonian gravity for point masses**. The implementation is compact enough to read end-to-end in a few files: [`src/engine/physics/gravity.ts`](../src/engine/physics/gravity.ts), [`src/engine/physics/world.ts`](../src/engine/physics/world.ts), [`src/engine/simulation/engine.ts`](../src/engine/simulation/engine.ts) and [`src/engine/numeric.ts`](../src/engine/numeric.ts).

## Force law

For bodies `i` and `j` at separation `r`:

- Force magnitude: `F = G · mᵢ · mⱼ / (r² + ε²)`
- Acceleration of `i` due to `j`: `aᵢⱼ = G · mⱼ · r⃗ᵢⱼ / (r² + ε²)^(3/2)`

`ε` is the Plummer-style softening length. The code clamps it to at least `1e-6 m` even when the configured value is zero, so coincident bodies never produce an infinite force. Softening is a **numerical regularisation**, not a finite-size body model.

`G = 6.6743e-11 m³ kg⁻¹ s⁻²` is defined in [`src/engine/numeric.ts`](../src/engine/numeric.ts) and copied into each `PhysicsWorld`. Scenario universes use `1e5` or `1e6 m` softening; the Gravity Lab exposes a logarithmic slider from 1 m to 1e9 m. The generic `createPhysicsWorld` fallback is 1e3 m, but normal scenario creation passes an explicit value through the engine options.

`fieldAcceleration(world, x, y, z)` applies the same law at an arbitrary point for the gravitational-field arrows.

## World memory layout

`PhysicsWorld` is a structure-of-arrays container:

| Buffer | Units | Purpose |
| --- | --- | --- |
| `mass`, `radius` | kg, m | Body properties |
| `pos` | m, stride 3 | Positions |
| `vel` | m/s, stride 3 | Velocities |
| `acc`, `accPrev` | m/s², stride 3 | Current and previous acceleration |
| `lockPos`, `lockVel` | m, m/s | Anchors for locked bodies |
| `locked` | flag | Whether a body is advanced |
| `rk4.*` | scratch | Preallocated RK4 stage buffers |

`computeAccelerations` evaluates each unordered pair once and applies equal-and-opposite contributions, so a step conserves linear momentum to floating-point precision for unlocked bodies. It fills `world.acc` in place; no arrays are allocated during a step.

Body IDs map to indices through `world.ids`. `worldFromBodies` builds a world from `CelestialBody[]`; `syncWorldToBodies` writes results back; `transferWorldState` preserves state by ID when the body list changes during play.

## Locked bodies

A body with `locked: true` is pinned to `lockPos`/`lockVel`, captured when it is created or locked. After every integrator step, `restoreLockedBodies` resets its position and velocity. This is used for clean two-body demonstrations (for example the anchored Earth in `earth-moon`) and for central stars in several scenarios. A locked primary does **not** reciprocate dynamically: the pair does not orbit a common barycentre until the lock is removed.

## Collisions

Collisions are off by default (`CollisionMode = 'none'`) and are enabled by `collisionsEnabled` in the universe settings. Detection in [`src/engine/collision/collision.ts`](../src/engine/collision/collision.ts) is a geometric test: centre separation `< radiusᵢ + radiusⱼ`. Response modes:

| Mode | Behaviour |
| --- | --- |
| `none` | Detection disabled. |
| `elastic` | Normal impulse with restitution 1 and positional separation. |
| `inelastic` | Normal impulse with restitution 0 and positional separation. |
| `merge` | Mass-weighted position/velocity, volume-conserving radius `∛(rᵢ³ + rⱼ³)`, absorbed body made massless. |

These are illustrative rigid-sphere responses. No deformation, fragmentation, shock heating or contact gravity is modelled.

## Time and stepping

[`SimulationClock`](../src/engine/simulation/clock.ts) converts real frame deltas into simulated seconds:

```
simulatedDelta = min(realDelta, 0.25) × speed × timeScale
```

`speed` is the user multiplier (UI presets 0.25–50); `timeScale` comes from the universe (often 3600 or 86400 simulated seconds per real second at 1×). `SimulationEngine.advance` converts that delta into fixed `timestep` steps, capped at `maxStepsPerFrame = 32`. For details on what happens when the cap is hit, see [Performance](performance.md).

`stepBackward` negates all velocities, performs one forward step and negates them again; it is an approximate teaching aid, not an exact time-reversal of dissipative events or collisions.

## Diagnostics derived from the same state

- [`src/engine/energy/energy.ts`](../src/engine/energy/energy.ts): kinetic energy `Σ½mv²`, softened potential `−Gmᵢmⱼ/√(r²+ε²)`, angular and linear momentum.
- [`src/engine/energy/stability.ts`](../src/engine/energy/stability.ts): drift against a baseline captured at reset or structural edit.
- [`src/engine/coordinates/barycenter.ts`](../src/engine/coordinates/barycenter.ts): mass-weighted centre of mass and barycentric frame shifts.
- [`src/engine/orbits/orbital.ts`](../src/engine/orbits/orbital.ts): instantaneous osculating Keplerian elements.
- [`src/engine/physics/limits.ts`](../src/engine/physics/limits.ts) and [`src/engine/analysis/astrophysics.ts`](../src/engine/analysis/astrophysics.ts): closed-form teaching estimates such as escape speed, Hill radius and Schwarzschild radius. See [Scientific limitations](scientific-limitations.md).

Continue with [Integrators](integrators.md) and [Coordinates and scales](coordinates-and-scales.md).
