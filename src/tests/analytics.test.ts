import { describe, expect, it } from 'vitest';
import { AnalyticsRecorder } from '../state/analytics';
import { PerformanceMonitor } from '../state/performanceMonitor';
import { SimulationEngine } from '../engine/simulation/engine';
import { getScenario } from '../scenarios/registry';

describe('analytics recorder', () => {
  it('samples energy and orbital diagnostics from the live engine', () => {
    const scenario = getScenario('circular-orbit')!;
    const engine = new SimulationEngine(scenario.universe.bodies, scenario.universe.settings);
    const recorder = new AnalyticsRecorder();
    recorder.sample(engine, 'orbiter', 60, true);
    engine.clock.elapsed = 3600;
    engine.step();
    recorder.sample(engine, 'orbiter', 58, true);
    expect(recorder.samples).toHaveLength(2);
    expect(recorder.latest()?.total).toBeLessThan(0);
    expect(recorder.latest()?.distance).toBeGreaterThan(0);
    expect(recorder.latest()?.speed).toBeGreaterThan(0);
    expect(recorder.series('total')).toHaveLength(2);
    expect(Number.isFinite(recorder.energyDrift())).toBe(true);
  });

  it('bounds its history', () => {
    const engine = new SimulationEngine(getScenario('earth-moon')!.universe.bodies);
    const recorder = new AnalyticsRecorder();
    recorder.maxSamples = 20;
    for (let i = 0; i < 50; i += 1) {
      engine.clock.elapsed = i;
      recorder.sample(engine, null, 60, true);
    }
    expect(recorder.samples).toHaveLength(20);
  });

  it('measures frame rate and adapts quality', () => {
    const monitor = new PerformanceMonitor();
    monitor.mark();
    expect(Number.isFinite(monitor.fps)).toBe(true);
    expect(monitor.qualityMultiplier).toBeGreaterThan(0);
  });
});
