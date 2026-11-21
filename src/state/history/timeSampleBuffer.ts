import { clampCapacity, isFiniteNumber, isRecord, readNumber } from './serialization';

export interface TimeSample {
  time: number;
  value: number;
}

export interface TimeSampleBufferOptions {
  capacity?: number;
  minInterval?: number;
}

/** Fixed-memory ring buffer of numeric samples keyed by monotonically increasing time. */
export class TimeSampleBuffer {
  readonly capacity: number;
  readonly minInterval: number;
  private times: Float64Array;
  private values: Float64Array;
  private head = 0;
  private sampleCount = 0;
  private lastTime = Number.NEGATIVE_INFINITY;

  constructor(options: TimeSampleBufferOptions = {}) {
    this.capacity = clampCapacity(options.capacity, 120);
    this.minInterval = Math.max(0, readNumber(options.minInterval));
    this.times = new Float64Array(this.capacity);
    this.values = new Float64Array(this.capacity);
  }

  get size(): number {
    return this.sampleCount;
  }

  /** Returns false for non-finite, out-of-order or throttled samples. */
  push(time: number, value: number): boolean {
    if (!Number.isFinite(time) || !Number.isFinite(value)) return false;
    if (time < this.lastTime) return false;
    if (this.minInterval > 0 && this.sampleCount > 0 && time - this.lastTime < this.minInterval) return false;
    this.write(time, value);
    return true;
  }

  at(index: number): TimeSample | null {
    if (index < 0 || index >= this.sampleCount) return null;
    const slot = this.slotAt(index);
    return { time: this.times[slot], value: this.values[slot] };
  }

  latest(): TimeSample | null {
    return this.at(this.sampleCount - 1);
  }

  /** Samples in chronological order, oldest first. */
  toArray(): TimeSample[] {
    const result: TimeSample[] = [];
    for (let i = 0; i < this.sampleCount; i += 1) result.push(this.at(i)!);
    return result;
  }

  /** Linear interpolation inside the retained range; null outside it. */
  valueAt(time: number): number | null {
    if (this.sampleCount === 0) return null;
    const first = this.at(0)!;
    const last = this.latest()!;
    if (time < first.time || time > last.time) return null;
    for (let i = 1; i < this.sampleCount; i += 1) {
      const right = this.at(i)!;
      if (time <= right.time) {
        const left = this.at(i - 1)!;
        if (right.time === left.time) return right.value;
        const ratio = (time - left.time) / (right.time - left.time);
        return left.value + (right.value - left.value) * ratio;
      }
    }
    return last.value;
  }

  extent(): { min: number; max: number } | null {
    if (this.sampleCount === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.sampleCount; i += 1) {
      const value = this.values[this.slotAt(i)];
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max };
  }

  reset(): void {
    this.head = 0;
    this.sampleCount = 0;
    this.lastTime = Number.NEGATIVE_INFINITY;
  }

  toJSON(): TimeSample[] {
    return this.toArray();
  }

  static fromJSON(data: unknown, options?: TimeSampleBufferOptions): TimeSampleBuffer {
    const buffer = new TimeSampleBuffer(options);
    if (!Array.isArray(data)) return buffer;
    const samples: TimeSample[] = [];
    for (const item of data) {
      if (!isRecord(item) || !isFiniteNumber(item.time) || !isFiniteNumber(item.value)) continue;
      samples.push({ time: item.time, value: item.value });
    }
    samples.sort((a, b) => a.time - b.time);
    for (const sample of samples) buffer.write(sample.time, sample.value);
    return buffer;
  }

  private slotAt(index: number): number {
    const start = this.sampleCount === this.capacity ? this.head : 0;
    return (start + index) % this.capacity;
  }

  private write(time: number, value: number): void {
    this.times[this.head] = time;
    this.values[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    this.sampleCount = Math.min(this.sampleCount + 1, this.capacity);
    this.lastTime = time;
  }
}
