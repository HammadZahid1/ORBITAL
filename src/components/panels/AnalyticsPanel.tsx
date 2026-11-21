import { useState } from 'react';
import { ChartNoAxesCombined, Download, RotateCcw } from 'lucide-react';
import { formatScientific } from '../../engine/numeric';
import { analytics, METRICS } from '../../state/analytics';
import { performanceMonitor } from '../../state/performanceMonitor';
import { useSimulationStore } from '../../state/simulationStore';
import { useUIStore } from '../../state/uiStore';
import { downloadText, toCsv } from '../../storage/download';
import { Badge, Button, Panel, PanelHeader, PanelSection, PropertyRow, SegmentedControl } from '../ui';
import { EnergyChart } from '../charts/EnergyChart';
import { OrbitChart } from '../charts/OrbitChart';

type ChartId = 'energy' | 'orbit';

/** Analysis workspace: live diagnostics, charts and data export. */
export function AnalyticsPanel() {
  const frame = useSimulationStore((state) => state.frame);
  const notify = useUIStore((state) => state.notify);
  const [chart, setChart] = useState<ChartId>('energy');
  const samples = [...analytics.samples];
  const latest = analytics.latest();
  void frame;

  const exportCsv = () => {
    const headers = ['time', ...METRICS.map((metric) => metric.id)];
    const rows = analytics.samples.map((sample) =>
      headers.map((header) => (sample as unknown as Record<string, number>)[header] ?? 0),
    );
    downloadText('orbital-analytics.csv', toCsv(headers, rows), 'text/csv;charset=utf-8');
    notify('Analytics exported as CSV', 'success');
  };

  return (
    <Panel>
      <PanelHeader
        title="Analysis"
        subtitle="Live solver diagnostics"
        icon={<ChartNoAxesCombined size={14} />}
        actions={<Badge tone="accent">{samples.length} samples</Badge>}
      />
      <PanelSection title="Chart" dense>
        <SegmentedControl<ChartId>
          value={chart}
          options={[
            { value: 'energy', label: 'Energy' },
            { value: 'orbit', label: 'Orbit' },
          ]}
          onChange={setChart}
        />
        <div className="mt-2">
          {chart === 'energy' ? <EnergyChart samples={samples} /> : <OrbitChart samples={samples} />}
        </div>
      </PanelSection>
      <PanelSection title="Latest" dense>
        {latest ? (
          <>
            <PropertyRow label="Time" value={`${formatScientific(latest.time, 2)} s`} />
            <PropertyRow label="Total energy" value={`${formatScientific(latest.total)} J`} accent />
            <PropertyRow label="Energy drift" value={formatScientific(analytics.energyDrift(), 3)} />
            <PropertyRow label="Momentum" value={`${formatScientific(latest.linearMomentum)} kg·m/s`} />
            <PropertyRow label="Angular mom." value={`${formatScientific(latest.angularMomentum)} kg·m²/s`} />
            <PropertyRow label="Frame rate" value={`${performanceMonitor.fps.toFixed(1)} fps`} />
          </>
        ) : (
          <p className="text-[9px] text-faint">No samples recorded yet.</p>
        )}
      </PanelSection>
      <PanelSection title="Data" dense>
        <div className="flex gap-2">
          <Button size="sm" icon={<Download size={12} />} onClick={exportCsv} className="flex-1">
            Export CSV
          </Button>
          <Button
            size="sm"
            icon={<RotateCcw size={12} />}
            onClick={() => {
              analytics.reset();
              notify('Analytics history cleared');
            }}
            className="flex-1"
          >
            Clear
          </Button>
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          Charts show measured solver output, not analytic curves. A bounded 600-sample window is kept in memory.
        </p>
      </PanelSection>
    </Panel>
  );
}
