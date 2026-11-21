/** Tracks simulated time independently from wall-clock time. */
export class SimulationClock {
  /** Elapsed simulated time in seconds. */
  elapsed = 0;
  /** Multiplier applied by the user (0.25 – 50 by default). */
  speed = 1;
  /** Simulated seconds per real second at speed 1. */
  timeScale = 1;
  running = false;
  /** Number of integration steps performed. */
  steps = 0;

  /** Converts a real-time delta into simulated seconds. */
  simulatedDelta(realDeltaSeconds: number): number {
    if (!this.running || !Number.isFinite(realDeltaSeconds) || realDeltaSeconds <= 0) return 0;
    const clamped = Math.min(realDeltaSeconds, 0.25);
    return clamped * this.speed * this.timeScale;
  }

  advance(realDeltaSeconds: number): number {
    const delta = this.simulatedDelta(realDeltaSeconds);
    this.elapsed += delta;
    return delta;
  }

  stepForward(simulatedSeconds: number): void {
    if (!Number.isFinite(simulatedSeconds)) return;
    this.elapsed += simulatedSeconds;
  }

  stepBackward(simulatedSeconds: number): void {
    if (!Number.isFinite(simulatedSeconds)) return;
    this.elapsed = Math.max(0, this.elapsed - simulatedSeconds);
  }

  reset(): void {
    this.elapsed = 0;
    this.steps = 0;
  }

  setSpeed(speed: number): void {
    if (Number.isFinite(speed) && speed >= 0) this.speed = speed;
  }

  setTimeScale(scale: number): void {
    if (Number.isFinite(scale) && scale > 0) this.timeScale = scale;
  }
}
