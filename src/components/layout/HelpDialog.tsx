import { useUIStore } from '../../state/uiStore';
import { Dialog, KeyHint, PanelSection } from '../ui';

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play or pause the simulation'],
  ['← / →', 'Step backward or forward'],
  ['R', 'Reset to initial conditions'],
  ['F', 'Focus the selected body'],
  ['L', 'Toggle labels'],
  ['G', 'Toggle reference grid'],
  ['O', 'Toggle orbit paths'],
  ['Ctrl/⌘ + K', 'Open command palette'],
  ['?', 'Open this help dialog'],
  ['Esc', 'Close overlays'],
];

/** Help dialog documenting controls and the educational scope of the model. */
export function HelpDialog() {
  const open = useUIStore((state) => state.helpOpen);
  const setOpen = useUIStore((state) => state.setHelpOpen);

  if (!open) return null;

  return (
    <Dialog title="Help & model notes" onClose={() => setOpen(false)} width="max-w-2xl">
      <div className="grid gap-3 md:grid-cols-2">
        <PanelSection title="Keyboard" dense>
          <div className="space-y-1.5">
            {SHORTCUTS.map(([key, description]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted">{description}</span>
                <KeyHint>{key}</KeyHint>
              </div>
            ))}
          </div>
        </PanelSection>
        <PanelSection title="Navigation" dense>
          <ul className="space-y-1.5 text-[10px] leading-relaxed text-muted">
            <li>Drag in the viewport to orbit the camera; scroll to zoom.</li>
            <li>Click a body to select it; click empty space to clear selection.</li>
            <li>Use the layer tab to reveal vectors, field samples or the barycentre.</li>
            <li>Use the scenario strip at the bottom to switch between prepared systems.</li>
          </ul>
        </PanelSection>
      </div>
      <PanelSection title="Scientific scope" dense>
        <p className="text-[10px] leading-relaxed text-muted">
          ORBITAL integrates Newtonian pairwise gravity with Plummer softening. It is an educational workstation, not a
          research-grade ephemeris service. Bodies are treated as point masses for force calculation; oblateness,
          radiation pressure, relativity, tides and atmospheric drag are not modelled. Orbital elements are instantaneous
          two-body osculating approximations of the full N-body state.
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-faint">
          Visual distance scales can be compressed, logarithmic or educational. These modes change rendering only; the
          solver always uses SI units and the selected scale does not alter physical results.
        </p>
      </PanelSection>
    </Dialog>
  );
}
