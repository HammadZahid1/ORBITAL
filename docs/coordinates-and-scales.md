# Coordinates and scales

ORBITAL separates physical state from the way that state is drawn. The solver always uses SI units: metres, kilograms, seconds, and radians. Drawing modes change only the mapping into Three.js scene units.

## Physical frame and constants

[`src/engine/numeric.ts`](../src/engine/numeric.ts) defines the constants used by scenarios and the engine: `G = 6.6743e-11 m³ kg⁻¹ s⁻²`, `AU = 1.495978707e11 m`, `SOLAR_MASS`, `EARTH_MASS`, `EARTH_RADIUS`, `DAY`, `YEAR`, and `C`. Formatting helpers such as `formatScientific` and `formatDuration` are presentation utilities; they do not alter solver values.

The simulation frame is Y-up. Classical orbital elements are converted to Cartesian state by `stateFromElements` in [`src/engine/orbits/orbital.ts`](../src/engine/orbits/orbital.ts). With zero inclination, an orbit lies in the **X–Z plane** and prograde motion has angular momentum along +Y. The function clamps eccentricity below 1 and semimajor axis above `1e-6 m`, applies rotations in argument-of-periapsis, inclination, and longitude-of-ascending-node order, and returns position and velocity relative to the attracting body. `bodyFactory.createOrbitalBody` uses this conversion when scenarios or the Builder create an orbiter from elements.

`calculateOrbitalElements` performs the reverse operation from an instantaneous two-body state. Its reference direction is +Y, and it reports `Infinity` for the period and apoapsis of unbound trajectories.

## Scene scale modes

[`src/engine/coordinates/scale.ts`](../src/engine/coordinates/scale.ts) defines `ScaleMode` and `SceneScale`. The base linear distance scale is the largest body position magnitude divided by 100, with a minimum extent of `1e6 m`.

| Mode | Position mapping | Radius scale | Intended use |
| --- | --- | --- | --- |
| `exploration` | Linear: `position / distance` | `distance / 24` | Default readable overview. |
| `compressed` | Per-axis signed `log10(1 + |value|/distance) × 8` | `distance / 60` | Compress very large ranges. |
| `educational` | Normalised logarithmic radial amount, preserving direction | `distance / 12` | Evenly spaced teaching view. |
| `realistic` | Linear: `position / distance` | Same as position scale | Linear distances; bodies remain clamped for visibility. |

`sceneRadius` divides the physical radius by the mode's radius scale, multiplies by `visual.visualScale`, and applies a floor: 1.5 scene units for stars, 1.2 for black holes, and 0.28 for everything else. Even `realistic` mode therefore keeps a minimum visible body size; the label describes distance handling, not literal sub-pixel radii.

`sceneVector` divides velocity, acceleration, and field vectors by the same distance scale as linear positions. In `compressed` and `educational` modes, vector glyph lengths are further compressed logarithmically by the rendering components, so arrow length is a visual indicator rather than a linear physical scale.

## Camera units

Scenario camera presets store `position`, `target`, and `suggestedDistance` in **scene units**, not metres; see [`src/scenarios/types.ts`](../src/scenarios/types.ts). [`CameraRig`](../src/components/celestial/CameraRig.tsx) treats tuples with a magnitude greater than 1000 as physical positions and converts them with `scenePosition`; smaller tuples are used directly. `OrbitControls` provides drag-to-orbit and scroll-to-zoom, with damping from settings and distance limits of 0.5–2000 scene units.

`requestCamera` in [`src/state/simulationStore.ts`](../src/state/simulationStore.ts) builds a camera request around the selected body's live physical position, while `loadScenario` uses the scenario's preset camera directly. `autoFollow` shifts the camera target with the selected body during `useFrame`.

## Frames and diagnostics

[`src/engine/coordinates/barycenter.ts`](../src/engine/coordinates/barycenter.ts) provides the mass-weighted centre of mass, its velocity, barycentric coordinates, a helper that shifts the whole world into the barycentric inertial frame, and relative-to-body positions. The Stellar Systems panel reads `centerOfMass` directly; the barycentre overlay draws the same quantity. These are diagnostics: shifting the frame does not change the physics.

Locked bodies keep their own `lockPos` and `lockVel` anchors. A locked primary is fixed in the chosen inertial frame and does not respond to the orbiter; see [Physics model](physics-model.md).

## Visual scale is not physics

LayerControls offers Explore, Log, Learn, and True scale buttons. These call `setScaleMode` in [`src/state/uiStore.ts`](../src/state/uiStore.ts) and rebuild `SceneScale`; they never write to `engine.options` or `PhysicsWorld`. Distances reported by panels, exports, and diagnostics continue to use SI values. For a fuller list of overlay behaviour, see [Rendering and visual layers](rendering-and-visual-layers.md).

Continue with [Data schema](data-schema.md) or [Modules](modules.md).
