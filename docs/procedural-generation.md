# Procedural generation

The Universe Builder creates one body at a time. The generator in [`src/generators/universeGenerator.ts`](../src/generators/universeGenerator.ts) creates a whole illustrative system from a small configuration object. It is deterministic: the same inputs produce the same bodies, names, materials, and initial state.

## Configuration

`GeneratorConfig` contains `seed`, `systemName`, `starCount`, `planetCount`, `moonCount`, `asteroidCount`, `variation`, `orbitalSpread`, `preferredMaterials`, and `includeComet`. The defaults are seed `20261121`, name `Generated System`, 1 star, 6 planets, 3 moons, 24 asteroids, `balanced` variation, spread `3.2`, six common material presets, and a comet.

The random stream is created from `hashString(`${seed}:${systemName}:${variation}`)` and Mulberry32 `createRandom` from [`src/engine/numeric.ts`](../src/engine/numeric.ts). Changing the seed, name, or variation changes the stream; changing only the displayed planet count also changes how many draws occur, and therefore later bodies.

Count fields are floored and clamped:

| Field | Range |
| --- | --- |
| `starCount` | 1–3 |
| `planetCount` | 0–24 |
| `moonCount` | 0–48 |
| `asteroidCount` | 0–400 |

## Variation presets

| Variation | Eccentricity scale | Inclination scale | Mass spread |
| --- | --- | --- | --- |
| `calm` | 0.08 | 0.03 | 0.5 |
| `balanced` | 0.28 | 0.2 | 1.2 |
| `chaotic` | 0.55 | 0.55 | 2.2 |

These factors feed planet eccentricity, inclination, and mass randomness. They are teaching presets, not stability guarantees: a chaotic system can eject bodies or trigger merges.

## Generated structure

Stars are created first. The first star is locked and receives the primary name; additional stars are unlocked companions. Total stellar mass is `SOLAR_MASS × (0.8 + random() × 0.8)`, divided across the requested stars with small per-star variation.

Planets use `createOrbitalBody`, with semimajor axes spread by `orbitalSpread` AU, material picked from the preferred pool, and gas giants receiving rings with a probability check. Their parent is the first star. Moons are placed around planets round-robin using circular speeds `√(G·M_parent / r)` and inherit their parent's velocity. Asteroids are low-mass bodies on circular orbits around the primary. If `includeComet` is true, a final comet is created with eccentricity `0.8`, nonzero inclination, and a large semimajor axis.

`generateUniverse` returns a `Universe` with `G`, softening `1e6 m`, a 1-hour timestep, Velocity Verlet, merge collisions enabled, and a 3600× time scale. `generateScenario` wraps that universe with `makeScenario`; the scenario path therefore uses `makeScenario`'s softening default of `1e5 m` while retaining the generated timestep, time scale, and merge settings.

## UI exposure

The Saved Universes panel in [`src/components/panels/SavedPanel.tsx`](../src/components/panels/SavedPanel.tsx) exposes only system name, integer seed, planet count (capped at 16 in the form), and variation. The remaining generator defaults stay at 1 star, 3 moons, 24 asteroids, `orbitalSpread = 3.2`, the default material pool, and `includeComet = true`. `generatorSummary` formats a short count string but is not shown in the current panel.

Generated tags include `generated`, `seed:<n>`, and the variation. Generated notes explicitly say that parameters are illustrative and not derived from survey data.

## Reproducibility and limits

Reproducibility applies to generated initial conditions. Once loaded, the normal solver advances those bodies, so integrator choice, timestep, floating-point accumulation, and collisions determine the later state. The generator does not promise orbital stability, realistic multiplicity, habitable zones, or agreement with observed exoplanet systems.

For an empty workspace, use the `custom-universe` scenario instead. For portable saves, export the generated universe as JSON; see [Persistence and import/export](persistence-and-io.md). The generator tests live in [`src/tests/generator.test.ts`](../src/tests/generator.test.ts).

Continue with [Scenarios](scenarios.md) or [Scientific limitations](scientific-limitations.md).
