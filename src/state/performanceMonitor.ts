/** Tracks frame timing and suggests an adaptive render quality multiplier. */
export class PerformanceMonitor {
  private samples: number[] = [];
  private lastFrame = performance.now();
  fps = 60;
  frameMs = 16.7;
  qualityMultiplier = 1;

  mark(): void {
    const now = performance.now();
    const delta = now - this.lastFrame;
    this.lastFrame = now;
    if (delta <= 0 || delta > 1000) return;
    this.samples.push(delta);
    if (this.samples.length > 60) this.samples.shift();
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.frameMs = average;
    this.fps = 1000 / average;
    this.qualityMultiplier = this.fps < 35 ? 0.65 : this.fps < 50 ? 0.85 : 1;
  }

  reset(): void {
    this.samples = [];
    this.fps = 60;
    this.frameMs = 16.7;
  }
}

export const performanceMonitor = new PerformanceMonitor();
