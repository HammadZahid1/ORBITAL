# Controls and accessibility

ORBITAL is a keyboard-friendly workstation with pointer-driven 3D navigation. Controls are distributed across the header, left navigation, right inspector, bottom timeline, command palette, and settings dialog.

## Keyboard shortcuts

[`useKeyboardShortcuts`](../src/hooks/useKeyboardShortcuts.ts) installs the global map. `Ctrl/⌘+K` and `Escape` are handled before the typing-target guard; other shortcuts are ignored while focus is in an input, textarea, select, or editable element.

| Input | Action |
| --- | --- |
| `Space` | Play or pause the simulation. |
| `→` | Advance one solver step. |
| `←` | Approximate single backward step. |
| `R` | Reset to initial conditions and show a notification. |
| `F` | Move the camera toward the selected body. |
| `L` | Toggle labels. |
| `G` | Toggle the reference grid. |
| `O` | Toggle orbit paths. |
| `?` | Open the help dialog. |
| `Ctrl/⌘+K` | Toggle the command palette. |
| `Escape` | Close command, settings, and help overlays. |

The same shortcuts are documented in [`HelpDialog.tsx`](../src/components/layout/HelpDialog.tsx). The command palette in [`CommandPalette.tsx`](../src/components/layout/CommandPalette.tsx) supports filtering, `ArrowUp`/`ArrowDown`, `Enter`, and mouse selection. It exposes all modules, all scenarios, and actions for play/pause, reset, camera focus, settings, and help.

## Pointer navigation

[`CameraRig`](../src/components/celestial/CameraRig.tsx) uses `OrbitControls`: drag to orbit and scroll to zoom, with damping and distance limits in scene units. Clicking a body in the viewport selects it; clicking empty space clears selection through `onPointerMissed` in [`SpaceScene.tsx`](../src/components/celestial/SpaceScene.tsx). Hover state is also used for body highlights.

Keyboard users can select bodies through the lists in [`ObjectList.tsx`](../src/components/panels/ObjectList.tsx), which provides focus, hide/show, and comparison buttons. The viewport mesh picking itself is pointer-driven; there is no keyboard spatial cursor in the current implementation.

## Layout and transport

[`TopNav`](../src/components/layout/TopNav.tsx) contains play/pause, single forward step, reset, a speed select (0.25× to 50×), command palette, settings, help, fullscreen, and panel toggles. [`BottomPanel`](../src/components/layout/BottomPanel.tsx) hosts [`Timeline`](../src/components/layout/Timeline.tsx), which adds backward stepping, integrator selection, timestep ÷2/×2 controls, softening readout, and the scenario strip. The bottom drawer can be resized by its drag handle or collapsed.

[`RightPanel`](../src/components/layout/RightPanel.tsx) switches among Inspect, Layers, and the active module. Focus mode hides the navigation, inspector, and bottom drawer so the viewport fills the window; the toggle lives in [`AppShell.tsx`](../src/components/layout/AppShell.tsx). [`useFullscreen`](../src/hooks/useFullscreen.ts) wraps the browser fullscreen API.

## Labels and semantics

The shared controls in [`src/components/ui/Controls.tsx`](../src/components/ui/Controls.tsx) label sliders, number fields, text fields, and selects with `aria-label` or wrapping `<label>` elements. `SegmentedControl` uses `role="group"` and `aria-pressed` for the active value. Icon buttons supply labels, and the command input has an accessible name.

This is useful but not a complete accessibility audit. The 3D scene is a canvas with pointer interaction; charts are SVG-based through Recharts; and no formal screen-reader or keyboard-only test suite is present. See [Testing](testing.md) for the current test scope.

## Motion and reduced motion

Two mechanisms reduce animation:

- The `Reduce motion` setting in [`SettingsDialog.tsx`](../src/components/layout/SettingsDialog.tsx) adds `orb-reduced-motion` to the app root and disables WebGL antialias when the Canvas is created.
- CSS in [`src/styles/index.css`](../src/styles/index.css) honours `prefers-reduced-motion: reduce` by shrinking animation and transition durations.

`panelAnimations` is exposed in Settings and persisted, but no CSS or component reads it. The exported `prefersReducedMotion()` helper in [`src/state/uiStore.ts`](../src/state/uiStore.ts) is also not called by the runtime. Do not rely on either as an accessibility control.

## Help and model notes

The help dialog states that ORBITAL uses softened Newtonian point-mass gravity, that orbital elements are instantaneous two-body approximations, and that visual scale modes do not affect physics. That guidance is expanded in [Scientific limitations](scientific-limitations.md) and [Coordinates and scales](coordinates-and-scales.md).

Continue with [Modules](modules.md) or [Rendering and visual layers](rendering-and-visual-layers.md).
