# Data schema

This page describes the TypeScript contracts, internal units and serialized formats used by ORBITAL. It documents the current code rather than a proposed standard.

## Shared vector and body types

[`src/types/vector.ts`](../src/types/vector.ts) defines `Vec3 { x, y, z }` and `Vec2`. Units are context-dependent: metres for positions, metres per second for velocities, metres per second squared for accelerations.

[`src/types/celestial.ts`](../src/types/celestial.ts) is the main domain contract:

- `BodyType`: `star`, `planet`, `dwarf`, `moon`, `asteroid`, `comet`, `custom`, `blackhole`.
- `MaterialPreset`: eleven visual styles — `rocky`, `desert`, `ocean`, `ice`, `gas-giant`, `clouded`, `volcanic`, `star`, `metal`, `comet`, `singularity`.
- `PhysicalProperties`: mass in kg, radius in m, position in m, velocity in m/s, acceleration in m/s², rotation in radians and rotation speed in rad/s.
- `VisualProperties`: colours, emissive intensity, material, `visualScale`, opacity, atmosphere/rings flags, `TrailConfig` and `labelVisible`. These are presentation-only.
- `CelestialBody`: `id`, `name`, `type`, `parentId`, physical/visual blocks, `visible`, `locked` and `notes`. `parentId` is used for display hierarchy and relative orbital analysis, not to make the solver hierarchical.
- `Universe`: `id`, `name`, `description`, `bodies`, `settings`, `createdAt`, `updatedAt` and `tags`.
- `UniverseSettings`: `G`, `softening`, `timestep`, `integrator`, `collisionMode`, `collisionsEnabled` and `timeScale`.
- `IntegratorId`: `euler`, `semi-implicit-euler`, `velocity-verlet`, `rk4`.
- `CollisionMode`: `none`, `elastic`, `inelastic`, `merge`.
- `ModuleId`: the eleven workspace IDs used by the module registry.

[`src/types/settings.ts`](../src/types/settings.ts) defines `AppSettings` for application preferences: theme, motion and label/grid flags, FPS display, panel animations, solver defaults, camera damping/distance, auto-follow, `PerformanceSettings`, `units` and `precision`. Several of these fields are stored but not applied by the current UI; the caveats are collected in [Performance](performance.md) and [Rendering and visual layers](rendering-and-visual-layers.md).

[`src/types/visualization.ts`](../src/types/visualization.ts) defines the thirteen `LayerId` values, `LayerState { visible, opacity, intensity }`, `LayerConfiguration` and `RenderQuality` (`low`, `balanced`, `high`, `custom`).

## Runtime physics layout

The solver does not operate on object arrays. [`PhysicsWorld`](../src/engine/physics/world.ts) is a structure of arrays: `mass` and `radius` are `Float64Array(capacity)`, while `pos`, `vel`, `acc`, `accPrev`, `lockPos` and `lockVel` are flat `Float64Array(capacity * 3)` buffers with x/y/z at stride 3. `locked` is a `Uint8Array`. Scratch buffers for RK4 live under `world.rk4`.

`worldFromBodies` copies definitions into this layout, `readVec3`/`writeVec3` convert to and from `Vec3`, and `syncWorldToBodies` writes live position/velocity/acceleration back into the user-facing `CelestialBody` objects. `transferWorldState` preserves state for matching IDs when a structural edit rebuilds the world. See [Physics model](physics-model.md).

Scenario definitions add camera metadata in [`src/scenarios/types.ts`](../src/scenarios/types.ts): `CameraConfiguration.position` and `.target` are scene units, not metres, and `suggestedDistance` is used in camera requests.

## Serialized envelope and validation

[`src/storage/schema.ts`](../src/storage/schema.ts) sets `SCHEMA_VERSION = 1` and `STORAGE_PREFIX = 'orbital:'`. Every JSON document uses:

```json
{
  "version": 1,
  "kind": "universe | settings",
  "savedAt": 1730000000000,
  "data": {}
}
```

`wrap(kind, data)` creates the envelope; `unwrap(raw, kind, validator)` parses it and returns `null` unless version and kind match and the validator passes. There is no migration path for other versions.

`validateUniverseShape` checks that the universe has string `id`/`name`, an array of bodies with unique IDs, a settings record with finite `G`, `softening` and `timestep`, and a valid `integrator`. `validateBodyShape` checks positive finite mass/radius, finite position/velocity/acceleration vectors, finite rotation fields, string `color`/`material`, positive `visualScale` and a finite `trail.length`. Validation is intentionally partial: fields such as `description`, timestamps, tags, collision options, most colour strings and enum membership are not exhaustively checked. Treat a passing validator as a safety filter, not proof of physical validity.

`validateSettingsShape` is similarly shallow; `normaliseSettings` merges any accepted object over `DEFAULT_SETTINGS` so new keys are always present.

## Storage keys and exports

[`src/storage/localStorage.ts`](../src/storage/localStorage.ts) prefixes keys and swallows storage errors. The effective keys are:

- `orbital:settings` — wrapped `AppSettings`.
- `orbital:universes:index` — JSON array of saved universe IDs.
- `orbital:universes:<id>` — one wrapped universe per save.

[`src/storage/importExport.ts`](../src/storage/importExport.ts) exports a pretty-printed universe envelope, imports only `version: 1` with `kind: 'universe'`, and sanitizes download names with `safeFilename`. [`src/storage/download.ts`](../src/storage/download.ts) creates Blob object URLs for JSON and CSV downloads. Analytics CSV headers are `time` plus the ten metric IDs in `METRICS`; see [Analysis and diagnostics](analysis-and-diagnostics.md).
