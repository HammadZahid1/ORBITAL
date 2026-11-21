import type { Vec3 } from '../../types/vector';
import type { PhysicsWorld } from '../physics/world';

export interface TrajectoryBuffer {
  id: string;
  /** Ring buffer of xyz triples. */
  data: Float64Array;
  capacity: number;
  count: number;
  head: number;
  lastSampleTime: number;
}

/** Fixed-memory history recorder. Sampling is throttled by simulated time. */
export class TrajectoryRecorder {
  readonly buffers = new Map<string, TrajectoryBuffer>();
  sampleInterval: number;
  maxPoints: number;

  constructor(maxPoints = 600, sampleInterval = 0) {
    this.maxPoints = Math.max(2, maxPoints);
    this.sampleInterval = sampleInterval;
  }

  register(id: string): void {
    if (this.buffers.has(id)) return;
    this.buffers.set(id, {
      id,
      data: new Float64Array(this.maxPoints * 3),
      capacity: this.maxPoints,
      count: 0,
      head: 0,
      lastSampleTime: Number.NEGATIVE_INFINITY,
    });
  }

  unregister(id: string): void {
    this.buffers.delete(id);
  }

  sync(world: PhysicsWorld): void {
    for (const id of world.ids) this.register(id);
    for (const id of [...this.buffers.keys()]) {
      if (!world.ids.includes(id)) this.unregister(id);
    }
  }

  record(world: PhysicsWorld, force = false): void {
    this.sync(world);
    for (let i = 0; i < world.count; i += 1) {
      const buffer = this.buffers.get(world.ids[i]);
      if (!buffer) continue;
      if (
        !force &&
        this.sampleInterval > 0 &&
        world.time - buffer.lastSampleTime < this.sampleInterval
      ) {
        continue;
      }
      buffer.lastSampleTime = world.time;
      const slot = buffer.head * 3;
      buffer.data[slot] = world.pos[i * 3];
      buffer.data[slot + 1] = world.pos[i * 3 + 1];
      buffer.data[slot + 2] = world.pos[i * 3 + 2];
      buffer.head = (buffer.head + 1) % buffer.capacity;
      buffer.count = Math.min(buffer.count + 1, buffer.capacity);
    }
  }

  /** Returns an ordered, contiguous copy of a body's trail. */
  positions(id: string): Float64Array {
    const buffer = this.buffers.get(id);
    if (!buffer || buffer.count === 0) return new Float64Array(0);
    const result = new Float64Array(buffer.count * 3);
    const start = buffer.count === buffer.capacity ? buffer.head : 0;
    for (let i = 0; i < buffer.count; i += 1) {
      const source = ((start + i) % buffer.capacity) * 3;
      result[i * 3] = buffer.data[source];
      result[i * 3 + 1] = buffer.data[source + 1];
      result[i * 3 + 2] = buffer.data[source + 2];
    }
    return result;
  }

  points(id: string): Vec3[] {
    const data = this.positions(id);
    const points: Vec3[] = [];
    for (let i = 0; i < data.length; i += 3) {
      points.push({ x: data[i], y: data[i + 1], z: data[i + 2] });
    }
    return points;
  }

  reset(id?: string): void {
    if (id) {
      const buffer = this.buffers.get(id);
      if (buffer) {
        buffer.count = 0;
        buffer.head = 0;
        buffer.lastSampleTime = Number.NEGATIVE_INFINITY;
      }
      return;
    }
    for (const buffer of this.buffers.values()) {
      buffer.count = 0;
      buffer.head = 0;
      buffer.lastSampleTime = Number.NEGATIVE_INFINITY;
    }
  }

  setMaxPoints(maxPoints: number): void {
    const next = Math.max(2, Math.floor(maxPoints));
    if (next === this.maxPoints) return;
    this.maxPoints = next;
    const existing = [...this.buffers.entries()];
    this.buffers.clear();
    for (const [id, old] of existing) {
      const ordered = this.positionsOf(old);
      this.register(id);
      const buffer = this.buffers.get(id)!;
      const count = Math.min(ordered.length / 3, next);
      const offset = ordered.length / 3 - count;
      buffer.data.set(ordered.subarray(offset * 3, ordered.length), 0);
      buffer.count = count;
      buffer.head = count % next;
      buffer.lastSampleTime = old.lastSampleTime;
    }
  }

  private positionsOf(buffer: TrajectoryBuffer): Float64Array {
    const result = new Float64Array(buffer.count * 3);
    const start = buffer.count === buffer.capacity ? buffer.head : 0;
    for (let i = 0; i < buffer.count; i += 1) {
      const source = ((start + i) % buffer.capacity) * 3;
      result[i * 3] = buffer.data[source];
      result[i * 3 + 1] = buffer.data[source + 1];
      result[i * 3 + 2] = buffer.data[source + 2];
    }
    return result;
  }
}
