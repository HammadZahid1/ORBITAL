# Modules

ORBITAL's "modules" are workspaces, not separate apps. They select which contextual panel appears in the inspector. The shared registry in [`src/state/moduleRegistry.ts`](../src/state/moduleRegistry.ts) is the source of truth for navigation, the command palette, help text, and module labels.

## Workspace map

| ID | Label | Group | Panel source | Purpose |
| --- | --- | --- | --- | --- |
| `explorer` | Universe Explorer | Explore | [`ExplorerPanel.tsx`](../src/components/panels/ExplorerPanel.tsx) | Body list, system summary, focus selected body. |
| `solar-system` | Solar System | Explore | [`SolarSystemPanel.tsx`](../src/components/panels/SolarSystemPanel.tsx) | Heliocentric planet distances and scenario reload. |
| `orbital` | Orbital Mechanics | Analyse | [`OrbitalPanel.tsx`](../src/components/panels/OrbitalPanel.tsx) | Osculating elements, forecast samples, Hohmann comparison. |
| `gravity` | Gravity Lab | Analyse | [`GravityPanel.tsx`](../src/components/panels/GravityPanel.tsx) | Integrator, conservation, softening, collisions. |
| `builder` | Universe Builder | Construct | [`BuilderPanel.tsx`](../src/components/panels/BuilderPanel.tsx) | Create orbiters and edit the selected body. |
| `asteroids` | Asteroid Observatory | Analyse | [`AsteroidPanel.tsx`](../src/components/panels/AsteroidPanel.tsx) | Small-body list and close-approach search. |
| `stellar` | Stellar Systems | Explore | [`StellarPanel.tsx`](../src/components/panels/StellarPanel.tsx) | Stars, barycentre, first two-star pair diagnostics. |
| `extreme` | Extreme Physics | Analyse | [`ExtremePanel.tsx`](../src/components/panels/ExtremePanel.tsx) | Closed-form limit estimates for the selected body. |
| `mission` | Mission Lab | Construct | [`MissionPanel.tsx`](../src/components/panels/MissionPanel.tsx) | Two-impulse Hohmann transfer budget. |
| `analytics` | Analysis | Analyse | [`AnalyticsPanel.tsx`](../src/components/panels/AnalyticsPanel.tsx) | Energy/orbit charts, latest diagnostics, CSV export. |
| `saved` | Saved Universes | Library | [`SavedPanel.tsx`](../src/components/panels/SavedPanel.tsx) | Scenarios, local saves, JSON I/O, generator controls. |

The `ModuleId` union in [`src/types/celestial.ts`](../src/types/celestial.ts) must stay in sync with `MODULES`. [`ModulePanelHost.tsx`](../src/components/panels/ModulePanelHost.tsx) maps each ID to its React component and renders the active one. It accepts a `compact` prop but currently ignores it.

## Where panels appear

[`RightPanel`](../src/components/layout/RightPanel.tsx) has three tabs: **Inspect**, **Layers**, and the active module's label. The Inspect tab shows [`BodyInspector`](../src/components/panels/BodyInspector.tsx) followed by the module panel. The Layers tab shows [`LayerControls`](../src/components/panels/LayerControls.tsx), including toggles, opacity, intensity, and scale mode. The module tab shows the same `ModulePanelHost` without the inspector above it.

[`LeftNav`](../src/components/layout/LeftNav.tsx) uses `MODULES` for navigation. [`CommandPalette`](../src/components/layout/CommandPalette.tsx) turns every module into an "Open …" command and every scenario into a "Load …" command. [`HelpDialog`](../src/components/layout/HelpDialog.tsx) also documents shortcuts and scientific scope.

`activeModule` lives in [`src/state/uiStore.ts`](../src/state/uiStore.ts) and starts as `explorer`. Changing it does not load a scenario or modify the simulation; it only changes which tools are visible. For example, opening Stellar Systems on a solar-system universe still reports the solar system's single star until a binary scenario is loaded.

## Shared panel behaviours

Most analysis panels subscribe to the simulation store's `frame` counter to invalidate `useMemo` caches that read mutable `engine.world` arrays. Charts and analytics are backed by module-level recorders rather than React state; see [Analysis and diagnostics](analysis-and-diagnostics.md).

[`ObjectList`](../src/components/panels/ObjectList.tsx) is reused by Explorer, Solar System, Stellar Systems, and Asteroid Observatory. It supports selection, focus, hide/show, and a comparison toggle. `comparisonIds` is stored in the UI store up to four entries, but no panel currently renders a comparison chart from it, so the toggle only highlights list state.

The Builder writes definitions through `addBody`, `updateBody`, `updatePhysical`, `updateVisual`, `removeBody`, and `duplicate`. Physical or structural edits rebuild the solver world with ID-based state transfer; visual-only edits do not. See [Architecture](architecture.md) for the ownership boundary.

## Modules versus scenarios

Modules select tools; [scenarios](scenarios.md) select universes. The bottom scenario strip in [`BottomPanel.tsx`](../src/components/layout/BottomPanel.tsx) can load any of the 14 built-ins regardless of the active module, and `loadScenario` also issues a camera request from the scenario preset.

Continue with [Scenarios](scenarios.md) and [Controls and accessibility](controls-and-accessibility.md).
