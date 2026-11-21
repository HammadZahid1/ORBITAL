import type { RenderQuality } from '../../types/visualization';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { Button, Dialog, PanelSection, SegmentedControl, Select, Slider, Toggle } from '../ui';

/** Application settings dialog with appearance, solver and performance groups. */
export function SettingsDialog() {
  const open = useUIStore((state) => state.settingsOpen);
  const setOpen = useUIStore((state) => state.setSettingsOpen);
  const settings = useUIStore((state) => state.settings);
  const updateSettings = useUIStore((state) => state.updateSettings);
  const setQuality = useUIStore((state) => state.setQuality);
  const notify = useUIStore((state) => state.notify);
  const integrator = useSimulationStore((state) => state.integrator);
  const setIntegrator = useSimulationStore((state) => state.setIntegrator);
  const timestep = useSimulationStore((state) => state.timestep);
  const setTimestep = useSimulationStore((state) => state.setTimestep);

  if (!open) return null;

  const updatePerformance = (patch: Partial<typeof settings.performance>) =>
    updateSettings({ performance: { ...settings.performance, ...patch } });

  return (
    <Dialog
      title="Settings"
      onClose={() => setOpen(false)}
      width="max-w-2xl"
      footer={
        <Button variant="primary" onClick={() => setOpen(false)}>
          Done
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <PanelSection title="Appearance" dense>
          <Select
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'midnight', label: 'Midnight' },
              { value: 'slate', label: 'Slate' },
            ]}
            onChange={(theme) => {
              updateSettings({ theme });
              document.documentElement.dataset.theme = theme;
            }}
          />
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(reduceMotion) => updateSettings({ reduceMotion })} />
          <Toggle label="Panel animations" checked={settings.panelAnimations} onChange={(panelAnimations) => updateSettings({ panelAnimations })} />
          <Toggle label="Show FPS" checked={settings.showFps} onChange={(showFps) => updateSettings({ showFps })} />
          <Slider
            label="Numeric precision"
            value={settings.precision}
            min={1}
            max={8}
            onChange={(precision) => updateSettings({ precision })}
          />
        </PanelSection>

        <PanelSection title="Solver defaults" dense>
          <Select
            label="Integrator"
            value={integrator}
            options={[
              { value: 'velocity-verlet', label: 'Velocity Verlet' },
              { value: 'semi-implicit-euler', label: 'Semi-implicit Euler' },
              { value: 'rk4', label: 'Runge–Kutta 4' },
              { value: 'euler', label: 'Explicit Euler' },
            ]}
            onChange={(value) => {
              setIntegrator(value);
              updateSettings({ integrator: value });
            }}
          />
          <Slider
            label="Base timestep"
            value={Math.log10(Math.max(timestep, 1))}
            min={0}
            max={6}
            step={0.05}
            display={`${timestep.toExponential(2)} s`}
            onChange={(value) => setTimestep(10 ** value)}
          />
          <Select
            label="Units"
            value={settings.units}
            options={[
              { value: 'si', label: 'SI (m, kg, s)' },
              { value: 'astronomical', label: 'Astronomical (AU, M☉, yr)' },
            ]}
            onChange={(units) => updateSettings({ units })}
          />
        </PanelSection>

        <PanelSection title="Camera" dense>
          <Slider
            label="Damping"
            value={settings.cameraDamping}
            min={0.02}
            max={1}
            step={0.02}
            display={settings.cameraDamping.toFixed(2)}
            onChange={(cameraDamping) => updateSettings({ cameraDamping })}
          />
          <Slider
            label="Default distance"
            value={settings.cameraDistance}
            min={10}
            max={300}
            step={5}
            onChange={(cameraDistance) => updateSettings({ cameraDistance })}
          />
          <Toggle
            label="Follow selected body"
            hint="Keeps the camera centred on the current selection"
            checked={settings.autoFollow}
            onChange={(autoFollow) => updateSettings({ autoFollow })}
          />
        </PanelSection>

        <PanelSection title="Performance" dense>
          <div className="py-1.5">
            <span className="mb-1.5 block text-[11px] text-muted">Quality preset</span>
            <SegmentedControl<RenderQuality>
              value={settings.performance.quality}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'high', label: 'High' },
                { value: 'custom', label: 'Custom' },
              ]}
              onChange={setQuality}
            />
          </div>
          <Toggle
            label="Adaptive quality"
            hint="Reduces visual density when frame rate drops"
            checked={settings.performance.adaptiveQuality}
            onChange={(adaptiveQuality) => updatePerformance({ adaptiveQuality })}
          />
          <Slider
            label="Star density"
            value={settings.performance.particleDensity}
            min={0.05}
            max={1}
            step={0.05}
            display={`${Math.round(settings.performance.particleDensity * 100)}%`}
            onChange={(particleDensity) => {
              setQuality('custom');
              updatePerformance({ particleDensity });
            }}
          />
          <Slider
            label="Trail length"
            value={settings.performance.trailLength}
            min={40}
            max={600}
            step={20}
            onChange={(trailLength) => {
              setQuality('custom');
              updatePerformance({ trailLength });
            }}
          />
          <Slider
            label="Pixel ratio cap"
            value={settings.performance.pixelRatioCap}
            min={1}
            max={2}
            step={0.25}
            display={`${settings.performance.pixelRatioCap.toFixed(2)}×`}
            onChange={(pixelRatioCap) => {
              setQuality('custom');
              updatePerformance({ pixelRatioCap });
            }}
          />
          <Toggle label="Shadows" checked={settings.performance.shadows} onChange={(shadows) => updatePerformance({ shadows })} />
          <Button
            size="sm"
            onClick={() => {
              useUIStore.getState().resetLayout();
              notify('Layout restored');
            }}
          >
            Reset layout
          </Button>
        </PanelSection>
      </div>
    </Dialog>
  );
}
