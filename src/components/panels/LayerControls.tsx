import type { LayerId } from '../../types/visualization';
import type { ScaleMode } from '../../engine/coordinates/scale';
import { useUIStore } from '../../state/uiStore';
import { Panel, PanelHeader, PanelSection, SegmentedControl, Slider, Toggle } from '../ui';

const LAYERS: Array<{ id: LayerId; label: string }> = [
  { id: 'bodies', label: 'Celestial bodies' },
  { id: 'labels', label: 'Labels' },
  { id: 'orbits', label: 'Orbit paths' },
  { id: 'trails', label: 'Historical trails' },
  { id: 'velocity-vectors', label: 'Velocity vectors' },
  { id: 'acceleration-vectors', label: 'Acceleration vectors' },
  { id: 'gravity-vectors', label: 'Gravity field' },
  { id: 'barycenter', label: 'Barycentre' },
  { id: 'grid', label: 'Reference grid' },
  { id: 'starfield', label: 'Starfield' },
  { id: 'asteroid-belts', label: 'Asteroid belts' },
  { id: 'comet-tails', label: 'Comet tails' },
  { id: 'spacetime', label: 'Potential sheet' },
];

const SCALES: Array<{ value: ScaleMode; label: string }> = [
  { value: 'exploration', label: 'Explore' },
  { value: 'compressed', label: 'Log' },
  { value: 'educational', label: 'Learn' },
  { value: 'realistic', label: 'True' },
];

/** Visibility, opacity and viewport-scale controls. */
export function LayerControls() {
  const layers = useUIStore((state) => state.layers);
  const toggleLayer = useUIStore((state) => state.toggleLayer);
  const setLayerOpacity = useUIStore((state) => state.setLayerOpacity);
  const setLayerIntensity = useUIStore((state) => state.setLayerIntensity);
  const scaleMode = useUIStore((state) => state.scaleMode);
  const setScaleMode = useUIStore((state) => state.setScaleMode);

  return (
    <Panel>
      <PanelHeader title="Viewport layers" subtitle="Visual overlays only — physics is unaffected" />
      <PanelSection title="Scale model" dense>
        <SegmentedControl value={scaleMode} options={SCALES} onChange={setScaleMode} label="Distance scale mode" />
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          Compressed, logarithmic and educational modes change drawing scale only. True scale preserves linear distances.
        </p>
      </PanelSection>
      <PanelSection title="Visibility" dense>
        <div className="space-y-0.5">
          {LAYERS.map(({ id, label }) => (
            <div key={id} className="rounded-[3px] px-1 hover:bg-white/3">
              <Toggle label={label} checked={layers[id].visible} onChange={() => toggleLayer(id)} />
              {layers[id].visible && (
                <div className="pb-1 pl-1">
                  <Slider
                    label="Opacity"
                    value={layers[id].opacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => setLayerOpacity(id, value)}
                    display={layers[id].opacity.toFixed(2)}
                  />
                  <Slider
                    label="Intensity"
                    value={layers[id].intensity}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(value) => setLayerIntensity(id, value)}
                    display={layers[id].intensity.toFixed(1)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}
