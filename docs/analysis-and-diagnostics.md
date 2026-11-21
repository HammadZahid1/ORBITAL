# Analysis and diagnostics

ORBITAL exposes two kinds of diagnostics: sampled measurements of the live solver, and pure helper formulas that estimate quantities from supplied numbers. They are implemented in different places and should not be treated as the same thing.

## Live sample recorder

[`src/state/analytics.ts`](../src/state/analytics.ts) defines `AnalyticsRecorder` and a module-level `analytics` singleton. [`src/hooks/useSimulationLoop.ts`](../src/hooks/useSimulationLoop.ts) calls `analytics.sample(...)` roughly every 160 ms of real time. Each [`AnalyticsSample`](../src/state/analytics.ts) stores:

- simulation time plus kinetic, potential and total energy;
- angular-momentum magnitude and linear-momentum magnitude;
- selected-body distance from the most massive body, orbital radius, speed and eccentricity;
- body count and measured frames per second.

History is bounded at 600 samples; older entries are removed with `splice`. `sampleInterval` defaults to zero and no UI control was found for it, so the practical cadence comes from the frame loop. `series(metric)` maps samples to `{ time, value }`, but the two built-in charts use sample index on their X axis, not the stored time.

`energyDrift()` compares the first and last totals in the current 600-sample window. It is not the same baseline as Gravity Lab: [`src/components/panels/GravityPanel.tsx`](../src/components/panels/GravityPanel.tsx) calls `analyseStability` from [`src/engine/energy/stability.ts`](../src/engine/energy/stability.ts) with `initialEnergy`, which the store captures at load, reset and structural edits. Gravity Lab also reports absolute drift, relative drift, angular momentum and a `momentumResidual` that is the current net momentum, not a difference from an initial momentum.

## Charts and CSV export

[`src/components/panels/AnalyticsPanel.tsx`](../src/components/panels/AnalyticsPanel.tsx) hosts the Analysis workspace. It shows a sample count badge, either an energy chart or an orbit chart, the latest scalar values, and two buttons: **Export CSV** and **Clear**.

- [`EnergyChart.tsx`](../src/components/charts/EnergyChart.tsx) plots kinetic, potential and total energy from the sample array.
- [`OrbitChart.tsx`](../src/components/charts/OrbitChart.tsx) plots selected-body distance, speed and eccentricity.
- CSV output uses [`toCsv`](../src/storage/download.ts), with headers `time` followed by the ten IDs in `METRICS`: total/kinetic/potential energy, angular and linear momentum, distance, speed, radius, eccentricity and fps. `bodyCount` is present in samples but not in that CSV header list. The download is generated in memory through a Blob and object URL.

The panel text is explicit: charts show measured solver output, not analytic curves.

## Energy and conservation helpers

[`src/engine/energy/energy.ts`](../src/engine/energy/energy.ts) computes kinetic energy as Σ½mv², angular momentum about the world origin as Σr×mv, and linear momentum as Σmv. Potential energy sums unique pairs using the configured softening: `−G·m₁·m₂ / sqrt(r² + ε²)`, matching the softened force law in [Physics model](physics-model.md). `energyDrift(current, initial)` returns a signed fraction, while `analyseStability` reports an absolute drift and an unsigned relative drift. These values are sensitive to timestep, integrator and softening; see [Integrators](integrators.md).

## Orbital and forecast tools

[`src/components/panels/OrbitalPanel.tsx`](../src/components/panels/OrbitalPanel.tsx) uses `calculateOrbitalElements` to show osculating eccentricity, semi-major axis, period, periapsis, apoapsis and specific energy for a selected body with a parent. It also calls [`predictTrajectory`](../src/engine/trajectory/prediction.ts), which clones the whole `PhysicsWorld`, disables collisions, advances the chosen integrator for up to 4000 steps and samples a path. The panel reports only the number of samples; it does not draw the predicted path in 3D.

[`hohmannTransfer`](../src/engine/orbits/transfer.ts) supplies coplanar, two-impulse Δv and duration estimates in Orbital Mechanics and [`MissionPanel.tsx`](../src/components/panels/MissionPanel.tsx). It assumes point masses, circular start and target orbits and instantaneous burns.

[`AsteroidPanel.tsx`](../src/components/panels/AsteroidPanel.tsx) calls [`findCloseApproach`](../src/engine/orbits/closeApproach.ts) for a selected small body and up to four planets. The search propagates both bodies and compares samples at matching indices; it returns the closest sampled separation, not a continuous closest-approach solution. [`StellarPanel.tsx`](../src/components/panels/StellarPanel.tsx) reports the barycentre and binary elements when at least two stars exist.

## Pure astrophysics library

[`src/engine/analysis/astrophysics.ts`](../src/engine/analysis/astrophysics.ts) is a validated library of teaching formulas: surface gravity and escape speed at altitude, sphere-of-influence and Hill radii, Roche limit, Kepler and synodic periods, specific energy and angular momentum, tidal acceleration, Schwarzschild-related estimates, Lorentz factor and Doppler shift, blackbody luminosity and habitable-zone bounds, impact/crater estimates, Tisserand parameter, collinear Lagrange-point estimates, a Jacobi-like diagnostic and velocity dispersion. Inputs and outputs are checked for finite values and invalid physical domains throw `RangeError`.

This library is used by panels, scenarios and tests; not every helper has a dedicated UI control. Its documentation repeatedly labels the formulas as idealised approximations. Cross-check assumptions against [Scientific limitations](scientific-limitations.md) before interpreting a displayed number.
