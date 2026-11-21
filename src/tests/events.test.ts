import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assessCapture,
  assessEscape,
  bodyFilter,
  bucketKey,
  CaptureTracker,
  CrossingTracker,
  compareEventPriority,
  createCloseApproachEvents,
  createCollisionEvents,
  createEscapeEvents,
  createSimulationEvent,
  defineEvent,
  detectCrossing,
  detectEscapes,
  deserializeEvent,
  deserializeEvents,
  EVENT_DEFINITIONS,
  EVENT_PRIORITY,
  EventBuffer,
  EventBus,
  EventStatistics,
  EventTimeline,
  eventBodyIds,
  getEventDefinition,
  matchesFilter,
  andFilter,
  notFilter,
  orFilter,
  nextEventSequence,
  positiveInt,
  resolvePriority,
  resetEventSequences,
  serializeEvent,
  serializeEvents,
  sortByPriority,
  Subscription,
  SubscriptionGroup,
  ThrottledEmitter,
  type SimulationEvent,
} from '../engine/events';
import { resetCollisionEventIds } from '../engine/collision/collision';
import { createPhysicsWorld, writeVec3, type PhysicsWorld } from '../engine/physics/world';

function eventAt(time: number, priority = 0, sequence?: number): SimulationEvent<'tick'> {
  return createSimulationEvent(
    'tick',
    { dt: 1, steps: 1, time },
    { time, priority, ...(sequence === undefined ? {} : { sequence }) },
  );
}

function collisionEvent(sequence: number): SimulationEvent<'collision'> {
  return createSimulationEvent(
    'collision',
    {
      id: `collision-${sequence}`,
      indexA: 0,
      indexB: 1,
      idA: 'a',
      idB: 'b',
      time: 5,
      distance: 1,
      relativeSpeed: 2,
      penetration: 0.1,
      response: 'elastic',
      absorbedIndex: null,
    },
    { time: 5, sequence },
  );
}

function overlapWorld(): PhysicsWorld {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.ids = ['a', 'b'];
  world.time = 12;
  world.collisionsEnabled = true;
  world.collisionMode = 'elastic';
  world.mass[0] = 10;
  world.mass[1] = 5;
  world.radius[0] = 1;
  world.radius[1] = 1;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 1.5, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 1, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: -1, y: 0, z: 0 });
  return world;
}

function staticPairWorld(): PhysicsWorld {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.ids = ['anchor', 'companion'];
  world.G = 1;
  world.locked[0] = 1;
  world.locked[1] = 1;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 0, y: 0, z: 1000 });
  return world;
}

/** Primary mass 1000, satellite mass 1 at r = 10; escape speed ~= 14.15. */
function orbitalWorld(radialSpeed: number, time = 0): PhysicsWorld {
  const world = createPhysicsWorld(2);
  world.count = 2;
  world.ids = ['primary', 'satellite'];
  world.G = 1;
  world.time = time;
  world.mass[0] = 1000;
  world.mass[1] = 1;
  writeVec3(world.pos, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.pos, 1, { x: 10, y: 0, z: 0 });
  writeVec3(world.vel, 0, { x: 0, y: 0, z: 0 });
  writeVec3(world.vel, 1, { x: radialSpeed, y: 0, z: 0 });
  return world;
}

beforeEach(() => {
  resetEventSequences();
  resetCollisionEventIds();
});

describe('typed event definitions', () => {
  it('creates events with finite defaults and generated ids', () => {
    const event = createSimulationEvent('tick', { dt: 0.5, steps: 2, time: 3 }, { time: 3 });
    expect(event).toEqual({
      type: 'tick',
      payload: { dt: 0.5, steps: 2, time: 3 },
      time: 3,
      sequence: 1,
      priority: EVENT_PRIORITY.lowest,
      id: 'tick-1',
    });
  });

  it('sanitises non-finite times, priorities and sequences', () => {
    const event = createSimulationEvent('tick', { dt: 1, steps: 1, time: 0 }, {
      time: Number.POSITIVE_INFINITY,
      priority: Number.NaN,
      sequence: Number.NEGATIVE_INFINITY,
    });
    expect(event.time).toBe(0);
    expect(event.sequence).toBe(1);
    expect(event.priority).toBe(EVENT_PRIORITY.lowest);
  });

  it('uses per-type definition priorities', () => {
    expect(createSimulationEvent('collision', collisionEvent(1).payload).priority).toBe(100);
    expect(createSimulationEvent('closeApproach', {
      id: 'x', indexA: 0, indexB: 1, idA: 'a', idB: 'b',
      distance: 1, time: 0, sampleIndex: 0, threshold: null,
    }).priority).toBe(10);
    expect(getEventDefinition('tick').category).toBe('simulation');
  });

  it('derives definitions without mutating built-ins', () => {
    const custom = defineEvent('crossing', { priority: 42, description: 'custom' });
    expect(custom.priority).toBe(42);
    expect(custom.description).toBe('custom');
    expect(EVENT_DEFINITIONS.crossing.priority).toBe(0);
    expect(defineEvent('tick', { priority: Number.POSITIVE_INFINITY }).priority).toBe(EVENT_PRIORITY.lowest);
  });

  it('resets and increments the shared sequence', () => {
    expect(nextEventSequence()).toBe(1);
    expect(eventAt(0).sequence).toBe(2);
    resetEventSequences();
    expect(eventAt(0).sequence).toBe(1);
  });
});

describe('priority ordering and subscription handles', () => {
  it('sorts by descending priority then ascending sequence without mutating input', () => {
    const low = eventAt(0, -1, 1);
    const high = eventAt(0, 10, 2);
    const tiedFirst = eventAt(0, 10, 3);
    const input = [low, high, tiedFirst];
    expect(sortByPriority(input).map((item) => item.sequence)).toEqual([2, 3, 1]);
    expect(input.map((item) => item.sequence)).toEqual([1, 2, 3]);
  });

  it('compares priorities deterministically', () => {
    expect(compareEventPriority(eventAt(0, 5, 1), eventAt(0, 1, 9))).toBeLessThan(0);
    expect(compareEventPriority(eventAt(0, 1, 1), eventAt(0, 1, 2))).toBeLessThan(0);
    expect(compareEventPriority(eventAt(0, 1, 3), eventAt(0, 1, 3))).toBe(0);
  });

  it('coerces invalid priority values to a finite fallback', () => {
    expect(resolvePriority(Number.NaN, 7)).toBe(7);
    expect(resolvePriority(Number.POSITIVE_INFINITY, 7)).toBe(7);
    expect(resolvePriority(-3, 7)).toBe(-3);
  });

  it('makes unsubscribe idempotent and supports pausing', () => {
    const dispose = vi.fn();
    const subscription = new Subscription(dispose);
    subscription.pause();
    expect(subscription.isEnabled()).toBe(false);
    subscription.resume();
    expect(subscription.isEnabled()).toBe(true);
    subscription.unsubscribe();
    subscription.unsubscribe();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(subscription.closed).toBe(true);
    subscription.resume();
    expect(subscription.isEnabled()).toBe(false);
  });

  it('groups subscriptions and tears them down together', () => {
    const first = new Subscription();
    const second = new Subscription();
    const group = new SubscriptionGroup([first, second]);
    expect(group.size).toBe(2);
    group.pause();
    expect(first.paused && second.paused).toBe(true);
    group.resume();
    group.unsubscribe();
    expect(group.size).toBe(0);
    expect(first.closed && second.closed).toBe(true);
  });
});

describe('event bus delivery', () => {
  it('delivers by descending listener priority', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    bus.on('tick', () => calls.push('normal'));
    bus.on('tick', () => calls.push('high'), { priority: 12 });
    bus.on('tick', () => calls.push('low'), { priority: -4 });
    expect(bus.emit(eventAt(1))).toBe(3);
    expect(calls).toEqual(['high', 'normal', 'low']);
  });

  it('keeps registration order for equal priorities', () => {
    const bus = new EventBus();
    const calls: number[] = [];
    bus.on('tick', () => calls.push(1));
    bus.on('tick', () => calls.push(2));
    bus.on('tick', () => calls.push(3));
    bus.emit(eventAt(1));
    expect(calls).toEqual([1, 2, 3]);
  });

  it('routes typed events to wildcard listeners', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.onAny((event) => seen.push(`${event.type}:${event.id}`));
    bus.publish('tick', { dt: 1, steps: 1, time: 0 });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('tick:');
    expect(bus.names()).toContain('*');
  });

  it('unsubscribes once handlers after a single delivery', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('tick', handler);
    bus.emit(eventAt(0));
    bus.emit(eventAt(1));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('tick')).toBe(0);
  });

  it('skips paused subscriptions and resumes them', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const subscription = bus.on('tick', handler);
    bus.emit(eventAt(0));
    subscription.pause();
    bus.emit(eventAt(1));
    subscription.resume();
    bus.emit(eventAt(2));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('off, clear and unsubscribe remove listeners consistently', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const handle = bus.on('tick', handler);
    expect(bus.off('tick', handler)).toBe(true);
    expect(bus.off('tick', handler)).toBe(false);
    bus.on('tick', () => undefined);
    bus.onAny(() => undefined);
    expect(bus.listenerCount()).toBe(2);
    bus.clear('tick');
    expect(bus.listenerCount()).toBe(1);
    bus.clear();
    expect(bus.listenerCount()).toBe(0);
    expect(handle.closed).toBe(true);
  });

  it('ignores malformed events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.onAny(handler);
    expect(bus.emit({ type: 'tick' } as unknown as SimulationEvent)).toBe(0);
    expect(bus.emit({ ...eventAt(1), time: Number.NaN })).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('event filtering', () => {
  it('applies type, time and priority specifications', () => {
    const event = eventAt(5, 20);
    expect(matchesFilter({ types: ['tick'], startTime: 5, endTime: 5, minPriority: 20, maxPriority: 20 }, event)).toBe(true);
    expect(matchesFilter({ types: ['collision'] }, event)).toBe(false);
    expect(matchesFilter({ startTime: 6 }, event)).toBe(false);
    expect(matchesFilter({ maxPriority: 19 }, event)).toBe(false);
  });

  it('matches any body identifier in payloads', () => {
    const collision = collisionEvent(1);
    expect(eventBodyIds(collision).sort()).toEqual(['a', 'b']);
    expect(matchesFilter({ bodyIds: ['b'] }, collision)).toBe(true);
    expect(matchesFilter({ bodyIds: ['missing'] }, collision)).toBe(false);
    expect(bodyFilter(['a'])(collision)).toBe(true);
  });

  it('composes predicate filters with and/or/not', () => {
    const event = collisionEvent(1);
    const high = (candidate: SimulationEvent) => candidate.priority >= 10;
    const collision = (candidate: SimulationEvent) => candidate.type === 'collision';
    expect(matchesFilter(andFilter(high, collision), event)).toBe(true);
    expect(matchesFilter(orFilter(() => false, collision), event)).toBe(true);
    expect(matchesFilter(notFilter(collision), event)).toBe(false);
    expect(matchesFilter(orFilter(), event)).toBe(false);
  });

  it('ignores non-finite filter bounds', () => {
    const event = eventAt(1, 1);
    expect(matchesFilter({ startTime: Number.NaN, endTime: Number.POSITIVE_INFINITY, minPriority: Number.NaN }, event)).toBe(true);
  });

  it('applies global and per-listener filters on the bus', () => {
    const bus = new EventBus({ globalFilter: { types: ['collision'] } });
    const seen: string[] = [];
    bus.on('collision', (event) => seen.push(event.id), { filter: { bodyIds: ['a'] } });
    expect(bus.emit(eventAt(0))).toBe(0);
    expect(bus.emit(collisionEvent(1))).toBe(1);
    expect(seen).toEqual(['collision-1']);
  });
});

describe('event buffering', () => {
  it('evicts the oldest event at capacity and counts drops', () => {
    const buffer = new EventBuffer({ capacity: 2 });
    buffer.push(eventAt(1));
    buffer.push(eventAt(2));
    buffer.push(eventAt(3));
    expect(buffer.size).toBe(2);
    expect(buffer.dropped).toBe(1);
    expect(buffer.peek()?.time).toBe(2);
    expect(buffer.at(1)?.time).toBe(3);
    expect(buffer.at(2)).toBeNull();
  });

  it('rejects invalid and non-matching events', () => {
    const buffer = new EventBuffer({ capacity: 2, filter: { types: ['tick'] } });
    expect(buffer.push({ type: 'tick' } as unknown as SimulationEvent)).toBe(false);
    expect(buffer.push(collisionEvent(1))).toBe(false);
    expect(buffer.push(eventAt(1))).toBe(true);
  });

  it('drains events in insertion order', () => {
    const buffer = EventBuffer.fromEvents([eventAt(2, 0, 1), eventAt(1, 0, 2)], {});
    expect(buffer.drain().map((event) => event.sequence)).toEqual([1, 2]);
    expect(buffer.size).toBe(0);
  });

  it('replays buffered events through a bus', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('tick', handler);
    const buffer = EventBuffer.fromEvents([eventAt(1), eventAt(2)]);
    expect(buffer.flushTo(bus)).toBe(2);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(buffer.size).toBe(0);
  });

  it('normalises invalid capacities', () => {
    expect(new EventBuffer({ capacity: -5 }).capacity).toBe(1);
    expect(positiveInt(Number.NaN, 8, 10)).toBe(8);
  });
});

describe('throttled emitter', () => {
  it('accepts a leading event and suppresses events inside the interval', () => {
    const sink = vi.fn();
    const emitter = new ThrottledEmitter(sink, { interval: 10 });
    expect(emitter.tryEmit(eventAt(0))).toBe(true);
    expect(emitter.tryEmit(eventAt(5))).toBe(false);
    expect(emitter.tryEmit(eventAt(10))).toBe(true);
    expect(sink).toHaveBeenCalledTimes(2);
    expect(emitter.lastAcceptedAt('tick')).toBe(10);
  });

  it('retains and flushes the latest suppressed event', () => {
    const sink = vi.fn();
    const emitter = new ThrottledEmitter(sink, { interval: 10, trailing: true });
    emitter.tryEmit(eventAt(0));
    emitter.tryEmit(eventAt(5));
    emitter.tryEmit(eventAt(9));
    expect(emitter.pendingCount).toBe(1);
    expect(emitter.flush()).toBe(1);
    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls[1][0].time).toBe(9);
    expect(emitter.pendingCount).toBe(0);
  });

  it('throttles keys independently', () => {
    const sink = vi.fn();
    const emitter = new ThrottledEmitter(sink, { interval: 10 });
    expect(emitter.tryEmit(eventAt(0))).toBe(true);
    expect(emitter.tryEmit(collisionEvent(1))).toBe(true);
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('passes every event when the interval is zero', () => {
    const sink = vi.fn();
    const emitter = new ThrottledEmitter(sink, { interval: -1 });
    emitter.tryEmit(eventAt(0));
    emitter.tryEmit(eventAt(0));
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed events and handles reversed time', () => {
    const sink = vi.fn();
    const emitter = new ThrottledEmitter(sink, { interval: 10 });
    expect(emitter.tryEmit({ type: 'tick' } as unknown as SimulationEvent)).toBe(false);
    expect(emitter.tryEmit(eventAt(100))).toBe(true);
    expect(emitter.tryEmit(eventAt(90))).toBe(false);
    expect(emitter.lastAcceptedAt('tick')).toBe(100);
    emitter.reset();
    expect(emitter.lastAcceptedAt('tick')).toBeNull();
    expect(bucketKey(eventAt(25), 10)).toBe('tick:2');
  });
});

describe('event serialisation', () => {
  it('round-trips events without sharing payload references', () => {
    const event = collisionEvent(3);
    const serialized = serializeEvent(event);
    expect(serialized).not.toBeNull();
    expect(serialized?.type).toBe('collision');
    const restored = deserializeEvent(JSON.parse(JSON.stringify(serialized)));
    expect(restored).toEqual(event);
    expect(restored?.payload).not.toBe(event.payload);
  });

  it('rejects non-finite payloads and malformed events', () => {
    const invalid = createSimulationEvent('tick', { dt: Number.POSITIVE_INFINITY, steps: 1, time: 0 });
    expect(serializeEvent(invalid)).toBeNull();
    expect(serializeEvent({ ...eventAt(0), time: Number.NaN })).toBeNull();
    expect(serializeEvent({ ...eventAt(0), payload: null } as unknown as SimulationEvent)).toBeNull();
  });

  it('validates required fields when deserialising', () => {
    const base = { type: 'tick', time: 0, sequence: 1, priority: 0, id: 'x' };
    expect(deserializeEvent({ ...base, payload: { dt: 1, steps: 2, time: 0 } })).not.toBeNull();
    expect(deserializeEvent({ ...base, payload: { dt: 1, time: 0 } })).toBeNull();
    expect(deserializeEvent({ ...base, payload: { dt: 1, steps: 2, time: 0 }, sequence: Number.NaN })).toBeNull();
    expect(deserializeEvent(null)).toBeNull();
  });

  it('serialises batches and skips invalid entries', () => {
    const events = [eventAt(0), createSimulationEvent('tick', { dt: Number.NaN, steps: 1, time: 0 })];
    expect(serializeEvents(events)).toHaveLength(1);
    expect(deserializeEvents('not-an-array')).toEqual([]);
    expect(deserializeEvents(serializeEvents(events))).toHaveLength(1);
  });

  it('accepts declaration-merged style payloads with plain records', () => {
    const custom = { type: 'custom', payload: { value: 'ok', nested: { a: [1, 2] } }, time: 1, sequence: 0, priority: 3, id: 'c' };
    expect(deserializeEvent(custom)?.payload).toEqual(custom.payload);
  });
});

describe('collision event adapter', () => {
  it('emits typed events only while collisions are enabled', () => {
    const world = overlapWorld();
    const events = createCollisionEvents(world);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('collision');
    expect(events[0].time).toBe(12);
    expect(events[0].payload).toMatchObject({ idA: 'a', idB: 'b', relativeSpeed: 2, response: 'elastic' });
    world.collisionsEnabled = false;
    expect(createCollisionEvents(world)).toHaveLength(0);
  });

  it('applies speed and distance thresholds', () => {
    expect(createCollisionEvents(overlapWorld(), { minRelativeSpeed: 3 })).toHaveLength(0);
    expect(createCollisionEvents(overlapWorld(), { maxDistance: 1 })).toHaveLength(0);
    expect(createCollisionEvents(overlapWorld(), { minRelativeSpeed: Number.NaN, maxDistance: 1.5 })).toHaveLength(1);
  });

  it('drops collision records containing non-finite values', () => {
    const world = overlapWorld();
    world.vel[3] = Number.POSITIVE_INFINITY;
    expect(createCollisionEvents(world)).toHaveLength(0);
  });
});

describe('close approach event adapter', () => {
  it('reports approaches below the threshold with body ids', () => {
    const events = createCloseApproachEvents(
      staticPairWorld(),
      [{ indexA: 0, indexB: 1 }],
      { steps: 10, dt: 60, integrator: 'velocity-verlet', threshold: 1200 },
    );
    expect(events).toHaveLength(1);
    expect(events[0].payload.distance).toBeCloseTo(1000, 6);
    expect(events[0].payload.idA).toBe('anchor');
    expect(events[0].payload.threshold).toBe(1200);
  });

  it('skips pairs above the threshold and invalid inputs', () => {
    const world = staticPairWorld();
    const pairs = [{ indexA: 0, indexB: 1 }];
    expect(createCloseApproachEvents(world, pairs, { steps: 10, dt: 60, threshold: 10 })).toHaveLength(0);
    expect(createCloseApproachEvents(world, [{ indexA: -1, indexB: 1 }, { indexA: 0, indexB: 0 }], { steps: 4, dt: 1 })).toHaveLength(0);
    expect(createCloseApproachEvents(world, pairs, { steps: 4, dt: -1 })).toHaveLength(0);
  });
});

describe('escape and capture detection', () => {
  it('reports outward unbound bodies and ignores bound ones', () => {
    const escaping = orbitalWorld(20);
    const assessment = assessEscape(escaping, 1, 0);
    expect(assessment?.escaped).toBe(true);
    expect(assessment?.specificEnergy).toBeGreaterThan(0);
    expect(detectEscapes(escaping)).toHaveLength(1);
    expect(createEscapeEvents(escaping)).toHaveLength(1);
    expect(detectEscapes(orbitalWorld(5))).toHaveLength(0);
  });

  it('honours minimum distance and outward-only options', () => {
    expect(assessEscape(orbitalWorld(20), 1, 0, { minDistance: 100 })?.escaped).toBe(false);
    const inbound = orbitalWorld(-20);
    expect(assessEscape(inbound, 1, 0)?.escaped).toBe(false);
    expect(assessEscape(inbound, 1, 0, { outwardOnly: false })?.escaped).toBe(true);
  });

  it('returns null for invalid indices and non-finite world data', () => {
    const world = orbitalWorld(20);
    expect(assessEscape(world, 0, 0)).toBeNull();
    expect(assessEscape(world, 5, 0)).toBeNull();
    world.mass[0] = Number.NaN;
    expect(assessEscape(world, 1, 0)).toBeNull();
    world.mass[0] = 1000;
    writeVec3(world.pos, 1, { x: Number.NaN, y: 0, z: 0 });
    expect(assessEscape(world, 1, 0)).toBeNull();
  });

  it('emits capture only on an unbound-to-bound transition', () => {
    const tracker = new CaptureTracker();
    expect(assessCapture(orbitalWorld(20), 1, 0)?.bound).toBe(false);
    tracker.observe(orbitalWorld(20), 1, 0);
    const event = tracker.update(orbitalWorld(-5, 42), 1, 0);
    expect(event?.type).toBe('capture');
    expect(event?.payload.radialSpeed).toBeLessThan(0);
    expect(event?.time).toBe(42);
    expect(tracker.update(orbitalWorld(-5, 43), 1, 0)).toBeNull();
  });

  it('does not fire on the first bound observation or invalid samples', () => {
    const tracker = new CaptureTracker();
    expect(tracker.update(orbitalWorld(-5), 1, 0)).toBeNull();
    expect(tracker.update(createPhysicsWorld(0), 0, 0)).toBeNull();
    expect(tracker.size).toBe(1);
  });

  it('tracks all bodies around the dominant primary', () => {
    const tracker = new CaptureTracker();
    tracker.observe(orbitalWorld(20), 1, 0);
    expect(tracker.trackAll(orbitalWorld(-5))).toHaveLength(1);
  });
});

describe('crossing detection', () => {
  it('detects pure plane crossings with direction and tolerance', () => {
    expect(detectCrossing(-1, 2, 0)).toEqual({ direction: 1, fraction: 1 / 3 });
    expect(detectCrossing(1, -1, 0)?.direction).toBe(-1);
    expect(detectCrossing(-1, 1, 2)).toBeNull();
    expect(detectCrossing(Number.NaN, 1)).toBeNull();
    expect(detectCrossing(1, 1)).toBeNull();
  });

  it('emits an interpolated crossing event after seeding', () => {
    const world = createPhysicsWorld(1);
    world.count = 1;
    world.ids = ['traveller'];
    world.time = 0;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: -1 });
    const tracker = new CrossingTracker({ axis: 'z', plane: 0 });
    expect(tracker.update(world, 0)).toBeNull();
    writeVec3(world.pos, 0, { x: 0, y: 0, z: 2 });
    world.time = 10;
    const event = tracker.update(world, 0);
    expect(event?.payload.direction).toBe(1);
    expect(event?.payload.from).toBe(-1);
    expect(event?.payload.to).toBe(2);
    expect(event?.payload.fraction).toBeCloseTo(1 / 3, 10);
    expect(event?.time).toBeCloseTo(10 / 3, 10);
  });

  it('supports reference-relative planes and resets samples', () => {
    const world = createPhysicsWorld(2);
    world.count = 2;
    world.ids = ['origin', 'mover'];
    writeVec3(world.pos, 0, { x: 5, y: 0, z: 0 });
    writeVec3(world.pos, 1, { x: 4, y: 0, z: 0 });
    const tracker = new CrossingTracker({ axis: 'x', referenceIndex: 0, plane: 1 });
    tracker.observe(world, 1);
    writeVec3(world.pos, 1, { x: 8, y: 0, z: 0 });
    expect(tracker.update(world, 1)?.payload.direction).toBe(1);
    tracker.reset(1);
    expect(tracker.size).toBe(0);
  });

  it('ignores non-finite positions and invalid indices', () => {
    const world = createPhysicsWorld(1);
    world.count = 1;
    writeVec3(world.pos, 0, { x: 0, y: 0, z: Number.POSITIVE_INFINITY });
    const tracker = new CrossingTracker();
    expect(tracker.update(world, 0)).toBeNull();
    expect(tracker.update(world, 4)).toBeNull();
    expect(tracker.size).toBe(0);
  });
});

describe('timeline and statistics', () => {
  it('orders records by time then sequence', () => {
    const timeline = new EventTimeline();
    timeline.recordAll([eventAt(2, 0, 1), eventAt(1, 0, 2), eventAt(1, 0, 1)]);
    expect(timeline.toArray().map((event) => `${event.time}:${event.sequence}`)).toEqual(['1:1', '1:2', '2:1']);
    expect(timeline.first()?.sequence).toBe(1);
    expect(timeline.last()?.time).toBe(2);
  });

  it('supports range, type and latest queries', () => {
    const timeline = new EventTimeline();
    timeline.recordAll([eventAt(1), eventAt(5), collisionEvent(2)]);
    expect(timeline.between(1, 5)).toHaveLength(3);
    expect(timeline.after(1)).toHaveLength(2);
    expect(timeline.before(5)).toHaveLength(1);
    expect(timeline.before(5, true)).toHaveLength(3);
    expect(timeline.atTime(5, 0.5)).toHaveLength(2);
    expect(timeline.byType('collision')).toHaveLength(1);
    expect(timeline.latest(2)).toHaveLength(2);
    expect(timeline.between(Number.NaN, 5)).toEqual([]);
  });

  it('evicts oldest records and rejects malformed ones', () => {
    const timeline = new EventTimeline({ capacity: 2 });
    timeline.recordAll([eventAt(1), eventAt(2), eventAt(3)]);
    expect(timeline.size).toBe(2);
    expect(timeline.first()?.time).toBe(2);
    expect(timeline.record({ type: 'tick' } as unknown as SimulationEvent)).toBe(false);
    timeline.clear();
    expect(timeline.size).toBe(0);
  });

  it('aggregates counts, priorities and time extent', () => {
    const stats = new EventStatistics();
    stats.recordAll([eventAt(0), eventAt(10), createSimulationEvent('collision', collisionEvent(1).payload, { time: 4, priority: 100 })]);
    expect(stats.total).toBe(3);
    expect(stats.count('tick')).toBe(2);
    expect(stats.snapshot().byPriority).toEqual({ '0': 2, '100': 1 });
    expect(stats.snapshot().firstTime).toBe(0);
    expect(stats.snapshot().lastTime).toBe(10);
    expect(stats.duration()).toBe(10);
    expect(stats.rate(0, 10)).toBeCloseTo(0.3, 10);
    expect(stats.rate(5, 5)).toBeNull();
  });

  it('returns detached snapshots and resets cleanly', () => {
    const stats = new EventStatistics();
    stats.record(eventAt(0));
    const snapshot = stats.snapshot();
    snapshot.byType.tick = 99;
    expect(stats.snapshot().byType.tick).toBe(1);
    stats.reset();
    expect(stats.snapshot()).toEqual({ total: 0, byType: {}, byPriority: {}, firstTime: null, lastTime: null });
  });

  it('ignores invalid events in both stores', () => {
    const invalid = { ...eventAt(0), sequence: Number.POSITIVE_INFINITY };
    const timeline = new EventTimeline();
    const stats = new EventStatistics();
    expect(timeline.record(invalid)).toBe(false);
    expect(stats.record(invalid)).toBe(false);
    expect(stats.recordAll([invalid])).toBe(0);
  });
});
