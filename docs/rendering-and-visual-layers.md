# Rendering and visual layers

ORBITAL renders with React Three Fiber (`@react-three/fiber`) and Three.js. The viewport is a client-side `Canvas`; it does not request textures, fonts, models, tile imagery or a rendering service. Every surface and effect described below is generated in code, mostly with inline GLSL.

## Scene entry point

[`src/components/celestial/SpaceScene.tsx`](../src/components/celestial/SpaceScene.tsx) creates the `Canvas` and composes the scene. The camera starts at `[42, 26, 48]`, field of view 52, near plane 0.05 and far plane 2400. Device pixel ratio is clamped to `min(pixelRatioCap, 2)`, antialiasing is disabled when `settings.reduceMotion` is true, and shadow maps follow `settings.performance.shadows`. `AdaptiveDpr` from drei adjusts resolution at runtime.

`SceneContents` computes a `SceneScale` from the current bodies and `scaleMode`, then adds a dark background, fog, an ambient light and a point light offset from the first star (or the first body if there is no star). The scale object is shared with every overlay so positions, radii and vectors use one mapping. See [Coordinates and scales](coordinates-and-scales.md) for the mapping itself.

The render order in the source is: starfield, reference grid helper, potential sheet, decorative asteroid swarm, orbit ellipses, historical trails, comet tails, body meshes, vector glyphs, gravitational field arrows, barycentre marker, camera controls. Most children return `null` when their layer is hidden.

## Bodies and procedural surfaces

[`src/components/celestial/BodyLayer.tsx`](../src/components/celestial/BodyLayer.tsx) reads the body list and selection state. It calculates a shader light position from the most massive star or black hole, then renders one [`CelestialBodyMesh`](../src/components/celestial/CelestialBodyMesh.tsx) per body. The mesh layer can be hidden wholesale with `layers.bodies.visible`; individual bodies also respect `body.visible`.

[`src/hooks/useLiveBodyTransform.ts`](../src/hooks/useLiveBodyTransform.ts) copies solver positions into scene-graph nodes inside `useFrame`. Positions always come from `engine.world`; React does not drive motion. Axial spin is the one exception: `body.physical.rotationSpeed` advances the visual rotation using simulated time, and is not part of the gravitational state. This preserves the strict separation described in [Architecture](architecture.md).

[`src/components/celestial/PlanetMaterial.tsx`](../src/components/celestial/PlanetMaterial.tsx) defines one vertex shader and one fragment shader with hash, value-noise and five-octave fbm functions. `STYLE_INDEX` maps the eleven `MaterialPreset` values to branches for rocky, desert, ocean, ice, gas-giant, clouded, volcanic, star, metal, comet and singularity surfaces. Emissive bodies add time-varying glow. Stars receive a 1.4× emissive multiplier in the mesh component.

Extra visual components are procedural too: [`Atmosphere.tsx`](../src/components/celestial/Atmosphere.tsx) draws a rim-glow sphere, [`RingSystem.tsx`](../src/components/celestial/RingSystem.tsx) builds five transparent annuli, and [`BlackHole.tsx`](../src/components/celestial/BlackHole.tsx) combines a black sphere, a rotating shader ring and a translucent halo. None of these solves radiative transfer or general relativity.

## Layer catalogue

[`src/components/panels/LayerControls.tsx`](../src/components/panels/LayerControls.tsx) exposes thirteen toggles and opacity/intensity sliders. Defaults live in [`src/state/defaults.ts`](../src/state/defaults.ts).

| Layer | Implementation | What is displayed |
| --- | --- | --- |
| Bodies | `BodyLayer` / `CelestialBodyMesh` | Live body meshes; individual labels require `body.visual.labelVisible`. |
| Labels | drei `Html` in `CelestialBodyMesh` | Small DOM labels above bodies; also gates the barycentre label. |
| Orbits | [`OrbitPaths.tsx`](../src/components/celestial/OrbitPaths.tsx) | Bound, parented osculating ellipses sampled at 128 points. Guidance curves only. |
| Trails | [`TrajectoryLines.tsx`](../src/components/celestial/TrajectoryLines.tsx) | Recorder history for bodies with trails enabled, capped by `performance.trailLength`. |
| Velocity / acceleration vectors | [`VectorGlyphs.tsx`](../src/components/celestial/VectorGlyphs.tsx) | `arrowHelper` glyphs from live `world.vel` and `world.acc`, with log-compressed visual lengths. |
| Gravity field | [`GravityFieldArrows.tsx`](../src/components/celestial/GravityFieldArrows.tsx) | A 7×7 sample grid around the centre of mass using `fieldAcceleration`. |
| Barycentre | [`BarycenterMarker.tsx`](../src/components/celestial/BarycenterMarker.tsx) | Instantaneous centre-of-mass sphere and rings. |
| Grid | Three.js `gridHelper` in `SpaceScene` | A fixed reference grid at scene y = −4. |
| Starfield | [`Starfield.tsx`](../src/components/celestial/Starfield.tsx) | 200–4200 seeded point sprites on a decorative shell; count scales with `particleDensity`. |
| Asteroid belts | [`AsteroidBelt.tsx`](../src/components/celestial/AsteroidBelt.tsx) | Seeded instanced swarm around the first star; hidden in `realistic` scale mode. |
| Comet tails | [`CometTails.tsx`](../src/components/celestial/CometTails.tsx) | Three-point line away from the first star, with a velocity fallback. |
| Potential sheet | [`SpacetimeGrid.tsx`](../src/components/celestial/SpacetimeGrid.tsx) | A shader-deformed plane using at most eight bodies and log-scaled masses. |

Simulated asteroids are ordinary bodies and therefore appear through `BodyLayer`; the `asteroid-belts` layer adds a separate decorative swarm.

## Current wiring caveats

The store accepts `visible`, `opacity` and `intensity` for every layer, but consumers use them unevenly. Opacity affects the grid, starfield, orbit lines, trails, comet tails and potential sheet. Body meshes ignore layer opacity; body-layer opacity only helps gate labels. Gravity-field arrows use `layers['gravity-vectors'].intensity`; most other intensity values are stored but not applied.

`settings.showLabels` and `settings.showGrid` also exist in [`src/types/settings.ts`](../src/types/settings.ts), but the visible implementation reads the layer configuration instead. `settings.cameraDistance` is stored but not used by [`CameraRig.tsx`](../src/components/celestial/CameraRig.tsx), which handles `cameraRequest`, damping and optional `autoFollow` through drei `OrbitControls`. These are stored/computed options, not active controls. See [Performance](performance.md) for quality presets and [Controls and accessibility](controls-and-accessibility.md) for input behaviour.

## Scientific interpretation

The viewport is deliberately illustrative. Visual radii are usually compressed by `sceneRadius`, compressed and educational modes distort distances, the starfield is not a star catalogue, the potential sheet is a metaphor for gravitational potential, and the black-hole shader is not lensing or a photon ray trace. Use [Analysis and diagnostics](analysis-and-diagnostics.md) and the numeric inspector for measurements; use this layer system for explanation and exploration.
