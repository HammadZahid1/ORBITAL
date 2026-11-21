import { useEffect } from 'react';
import { analytics } from '../state/analytics';
import { performanceMonitor } from '../state/performanceMonitor';
import { engine, useSimulationStore } from '../state/simulationStore';

/** Drives the fixed-step solver from the browser animation frame loop. */
export function useSimulationLoop(): void {
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let lastAnalytics = 0;

    const loop = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.25);
      previous = now;
      performanceMonitor.mark();
      useSimulationStore.getState().tick(delta);
      if (now - lastAnalytics > 160) {
        analytics.sample(engine, useSimulationStore.getState().selectedId, performanceMonitor.fps);
        lastAnalytics = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
}
