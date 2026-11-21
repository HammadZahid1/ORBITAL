import { describe, expect, it } from 'vitest';
import {
  CameraBookmarkStore,
  ChangeDetector,
  CommandLog,
  ComparisonPairTracker,
  EventDeduplicator,
  FilterHistory,
  NamedViewCollection,
  NotificationQueue,
  RecentScenarioTracker,
  SelectionHistory,
  SnapshotStore,
  TabStateMemory,
  TimeSampleBuffer,
  UndoRedoStack,
  clampCapacity,
  comparisonKey,
  diffKeys,
  isFiniteNumber,
  isRecord,
  isStringArray,
  readBoolean,
  readNumber,
  readString,
  structuralEquals,
} from '../state/history';

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('serialization helpers', () => {
  it('recognises JSON shapes and coerces values safely', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isFiniteNumber(3)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isStringArray(['a', 'b'])).toBe(true);
    expect(isStringArray(['a', 2])).toBe(false);
    expect(readString(42, 'fallback')).toBe('fallback');
    expect(readNumber('3', 7)).toBe(7);
    expect(readBoolean('yes', true)).toBe(true);
    expect(clampCapacity(0, 5)).toBe(1);
    expect(clampCapacity(2.8, 5)).toBe(2);
    expect(clampCapacity('bad', 5)).toBe(5);
  });
});

describe('SnapshotStore', () => {
  it('retains snapshots oldest first and looks them up by id', () => {
    const store = new SnapshotStore<string>(3);
    store.push('alpha', 'a', 10);
    store.push('beta', 'b', 20);
    expect(store.size).toBe(2);
    expect(store.at(0)).toEqual({ id: 'a', value: 'alpha', createdAt: 10 });
    expect(store.latest()?.value).toBe('beta');
    expect(store.values()).toEqual(['alpha', 'beta']);
    expect(store.find('a')?.createdAt).toBe(10);
    expect(store.find('missing')).toBeNull();
  });

  it('evicts the oldest snapshot at capacity', () => {
    const store = new SnapshotStore<number>(2);
    store.push(1, 'a', 10);
    store.push(2, 'b', 20);
    store.push(3, 'c', 30);
    expect(store.size).toBe(2);
    expect(store.values()).toEqual([2, 3]);
    expect(store.find('a')).toBeNull();
  });

  it('handles an empty store and clear', () => {
    const store = new SnapshotStore<string>();
    expect(store.latest()).toBeNull();
    expect(store.at(0)).toBeNull();
    store.push('x', 'x');
    store.clear();
    expect(store.size).toBe(0);
    expect(store.values()).toEqual([]);
  });

  it('serialises and restores snapshots, ignoring malformed entries', () => {
    const store = new SnapshotStore<{ value: number }>(3);
    store.push({ value: 1 }, 'one', 10);
    store.push({ value: 2 }, 'two', 20);
    const restored = SnapshotStore.fromJSON<{ value: number }>(roundTrip(store.toJSON()));
    expect(restored.toJSON()).toEqual(store.toJSON());
    expect(restored.latest()?.value).toEqual({ value: 2 });

    const filtered = SnapshotStore.fromJSON<number>([{ nope: true }, { id: 'ok', value: 5, createdAt: 1 }]);
    expect(filtered.values()).toEqual([5]);
    expect(SnapshotStore.fromJSON<number>('invalid').size).toBe(0);
  });
});

describe('UndoRedoStack', () => {
  it('commits, undoes and redoes present values', () => {
    const stack = new UndoRedoStack('a');
    stack.commit('b');
    stack.commit('c');
    expect(stack.current).toBe('c');
    expect(stack.canUndo).toBe(true);
    expect(stack.undo()).toBe('b');
    expect(stack.undo()).toBe('a');
    expect(stack.canUndo).toBe(false);
    expect(stack.redo()).toBe('b');
    expect(stack.redo()).toBe('c');
  });

  it('returns null on empty undo and redo stacks', () => {
    const stack = new UndoRedoStack(0);
    expect(stack.undo()).toBeNull();
    expect(stack.redo()).toBeNull();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoDepth).toBe(0);
    expect(stack.redoDepth).toBe(0);
  });

  it('clears the redo branch after a new commit', () => {
    const stack = new UndoRedoStack('a');
    stack.commit('b');
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.commit('c');
    expect(stack.current).toBe('c');
    expect(stack.canRedo).toBe(false);
    expect(stack.redo()).toBeNull();
  });

  it('bounds the past stack, including during redo', () => {
    const stack = new UndoRedoStack('a', 2);
    stack.commit('b');
    stack.commit('c');
    stack.commit('d');
    expect(stack.undoDepth).toBe(2);
    expect(stack.undo()).toBe('c');
    expect(stack.undo()).toBe('b');
    expect(stack.undo()).toBeNull();
    stack.redo();
    stack.redo();
    expect(stack.undoDepth).toBe(2);
  });

  it('serialises and restores stack state', () => {
    const stack = new UndoRedoStack({ n: 1 });
    stack.commit({ n: 2 });
    stack.undo();
    const restored = UndoRedoStack.fromJSON(roundTrip(stack.toJSON()), { n: 0 });
    expect(restored.current).toEqual({ n: 1 });
    expect(restored.canRedo).toBe(true);
    expect(restored.redo()).toEqual({ n: 2 });
    expect(UndoRedoStack.fromJSON(null, 'fallback').current).toBe('fallback');
  });
});

describe('CommandLog', () => {
  it('records commands with generated and explicit ids', () => {
    const log = new CommandLog();
    const first = log.record('add body');
    const second = log.record('remove body', 'undone', { id: 'custom', issuedAt: 100, durationMs: 12 });
    expect(first.id).toBe('cmd-1');
    expect(second).toEqual({
      id: 'custom',
      label: 'remove body',
      status: 'undone',
      issuedAt: 100,
      durationMs: 12,
    });
    expect(log.size).toBe(2);
  });

  it('returns recent entries newest first and filters by status', () => {
    const log = new CommandLog();
    log.record('one', 'applied', { issuedAt: 1 });
    log.record('two', 'failed', { issuedAt: 2 });
    log.record('three', 'applied', { issuedAt: 3 });
    expect(log.recent(2).map((entry) => entry.label)).toEqual(['three', 'two']);
    expect(log.recent(0)).toEqual([]);
    expect(log.byStatus('applied').map((entry) => entry.label)).toEqual(['one', 'three']);
    expect(log.filter((entry) => entry.issuedAt > 1)).toHaveLength(2);
  });

  it('updates outcomes and reports unknown ids', () => {
    const log = new CommandLog();
    const entry = log.record('move');
    expect(log.update(entry.id, { status: 'redone', durationMs: 8 })).toBe(true);
    expect(log.recent(1)[0].status).toBe('redone');
    expect(log.recent(1)[0].durationMs).toBe(8);
    expect(log.update('missing', { status: 'failed' })).toBe(false);
  });

  it('evicts oldest entries at capacity', () => {
    const log = new CommandLog(2);
    log.record('one');
    log.record('two');
    log.record('three');
    expect(log.recent().map((entry) => entry.label)).toEqual(['three', 'two']);
    expect(log.byStatus('applied')).toHaveLength(2);
  });

  it('serialises and restores the log', () => {
    const log = new CommandLog();
    log.record('one', 'applied', { issuedAt: 1 });
    log.record('two', 'failed', { issuedAt: 2 });
    const restored = CommandLog.fromJSON(roundTrip(log.toJSON()));
    expect(restored.toJSON()).toEqual(log.toJSON());
    expect(restored.record('three').id).toBe('cmd-3');
    expect(CommandLog.fromJSON([{ nope: true }]).size).toBe(0);
  });
});

describe('RecentScenarioTracker', () => {
  it('moves revisited scenarios to the front and counts visits', () => {
    const tracker = new RecentScenarioTracker();
    tracker.visit('solar', 100);
    tracker.visit('binary', 200);
    const again = tracker.visit('solar', 300);
    expect(tracker.ids()).toEqual(['solar', 'binary']);
    expect(again.visits).toBe(2);
    expect(tracker.get('solar')).toEqual({ id: 'solar', visits: 2, lastVisitedAt: 300 });
    expect(tracker.has('binary')).toBe(true);
  });

  it('evicts the least recently visited scenario', () => {
    const tracker = new RecentScenarioTracker(2);
    tracker.visit('a', 1);
    tracker.visit('b', 2);
    tracker.visit('c', 3);
    expect(tracker.ids()).toEqual(['c', 'b']);
    expect(tracker.has('a')).toBe(false);
  });

  it('removes and clears entries', () => {
    const tracker = new RecentScenarioTracker();
    tracker.visit('a', 1);
    expect(tracker.remove('a')).toBe(true);
    expect(tracker.remove('a')).toBe(false);
    tracker.visit('b', 2);
    tracker.clear();
    expect(tracker.size).toBe(0);
  });

  it('serialises and restores visit data', () => {
    const tracker = new RecentScenarioTracker();
    tracker.visit('solar', 100);
    tracker.visit('binary', 200);
    const restored = RecentScenarioTracker.fromJSON(roundTrip(tracker.toJSON()));
    expect(restored.toJSON()).toEqual(tracker.toJSON());
    expect(RecentScenarioTracker.fromJSON('bad').size).toBe(0);
  });
});

describe('SelectionHistory', () => {
  it('navigates back and forward through selections', () => {
    const history = new SelectionHistory();
    history.select('sun', 1);
    history.select('earth', 2);
    history.select('mars', 3);
    expect(history.current).toBe('mars');
    expect(history.back()).toBe('earth');
    expect(history.back()).toBe('sun');
    expect(history.back()).toBeNull();
    expect(history.forward()).toBe('earth');
    expect(history.forward()).toBe('mars');
    expect(history.forward()).toBeNull();
  });

  it('deduplicates consecutive selections and truncates the future', () => {
    const history = new SelectionHistory();
    history.select('a', 1);
    history.select('a', 2);
    expect(history.toArray()).toEqual([{ id: 'a', at: 2 }]);
    history.select('b', 3);
    history.select('c', 4);
    history.back();
    history.select('d', 5);
    expect(history.current).toBe('d');
    expect(() => history.forward()).not.toThrow();
    expect(history.canGoForward).toBe(false);
    expect(history.toArray().map((entry) => entry.id)).toEqual(['a', 'b', 'd']);
  });

  it('returns null from back and forward when empty', () => {
    const history = new SelectionHistory();
    expect(history.current).toBeNull();
    expect(history.back()).toBeNull();
    expect(history.forward()).toBeNull();
    history.clear();
    expect(history.size).toBe(0);
  });

  it('keeps the cursor valid after capacity eviction', () => {
    const history = new SelectionHistory(2);
    history.select('a', 1);
    history.select('b', 2);
    history.select('c', 3);
    expect(history.current).toBe('c');
    expect(history.toArray().map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(history.back()).toBe('b');
  });

  it('serialises entries and cursor', () => {
    const history = new SelectionHistory();
    history.select('a', 1);
    history.select('b', 2);
    history.back();
    const restored = SelectionHistory.fromJSON(roundTrip(history.toJSON()));
    expect(restored.toJSON()).toEqual(history.toJSON());
    expect(restored.forward()).toBe('b');
    expect(SelectionHistory.fromJSON(null).current).toBeNull();
  });
});

describe('CameraBookmarkStore', () => {
  const view = {
    position: [1, 2, 3] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    suggestedDistance: 10,
  };

  it('saves bookmarks and returns defensive copies', () => {
    const store = new CameraBookmarkStore();
    store.save('home', view, 100);
    const copy = store.get('home')!;
    expect(copy.view.position).toEqual([1, 2, 3]);
    copy.view.position[0] = 99;
    expect(store.get('home')?.view.position[0]).toBe(1);
    expect(store.has('home')).toBe(true);
    expect(store.names()).toEqual(['home']);
    expect(store.list()).toHaveLength(1);
  });

  it('overwrites names without evicting and removes bookmarks', () => {
    const store = new CameraBookmarkStore(2);
    store.save('a', view, 1);
    store.save('b', view, 2);
    store.save('a', { ...view, suggestedDistance: 20 }, 3);
    expect(store.size).toBe(2);
    expect(store.get('a')?.view.suggestedDistance).toBe(20);
    expect(store.remove('b')).toBe(true);
    expect(store.remove('b')).toBe(false);
    store.clear();
    expect(store.size).toBe(0);
  });

  it('evicts the oldest insertion on overflow', () => {
    const store = new CameraBookmarkStore(2);
    store.save('a', view, 1);
    store.save('b', view, 2);
    store.save('c', view, 3);
    expect(store.names()).toEqual(['b', 'c']);
  });

  it('serialises and validates camera views', () => {
    const store = new CameraBookmarkStore();
    store.save('home', view, 100);
    const restored = CameraBookmarkStore.fromJSON(roundTrip(store.toJSON()));
    expect(restored.toJSON()).toEqual(store.toJSON());
    expect(
      CameraBookmarkStore.fromJSON([{ name: 'bad', view: { position: [1, 2], target: [0, 0, 0], suggestedDistance: 1 } }]).size,
    ).toBe(0);
  });
});

describe('NotificationQueue', () => {
  it('enqueues and dequeues in FIFO order', () => {
    const queue = new NotificationQueue();
    expect(queue.enqueue('one', 'info', { createdAt: 1 }).id).toBe('note-1');
    queue.enqueue('two', 'warning', { createdAt: 2 });
    expect(queue.peek()?.message).toBe('one');
    expect(queue.dequeue()?.tone).toBe('info');
    expect(queue.pending().map((item) => item.message)).toEqual(['two']);
  });

  it('returns null when empty', () => {
    const queue = new NotificationQueue();
    expect(queue.peek()).toBeNull();
    expect(queue.dequeue()).toBeNull();
  });

  it('drops the oldest message at capacity', () => {
    const queue = new NotificationQueue(2);
    queue.enqueue('one', 'info', { createdAt: 1 });
    queue.enqueue('two', 'info', { createdAt: 2 });
    queue.enqueue('three', 'error', { createdAt: 3 });
    expect(queue.pending().map((item) => item.message)).toEqual(['two', 'three']);
  });

  it('dismisses by id and clears', () => {
    const queue = new NotificationQueue();
    const item = queue.enqueue('one');
    expect(queue.dismiss(item.id)).toBe(true);
    expect(queue.dismiss(item.id)).toBe(false);
    queue.enqueue('two');
    queue.clear();
    expect(queue.size).toBe(0);
  });

  it('serialises and restores the queue', () => {
    const queue = new NotificationQueue();
    queue.enqueue('one', 'success', { createdAt: 5 });
    const restored = NotificationQueue.fromJSON(roundTrip(queue.toJSON()));
    expect(restored.toJSON()).toEqual(queue.toJSON());
    expect(restored.dequeue()?.message).toBe('one');
  });
});

describe('ComparisonPairTracker', () => {
  it('treats pairs as unordered and deduplicates them', () => {
    const tracker = new ComparisonPairTracker();
    expect(comparisonKey('a', 'b')).toBe(comparisonKey('b', 'a'));
    expect(tracker.create('earth', 'sun', 10)).toEqual({ a: 'earth', b: 'sun', createdAt: 10 });
    expect(tracker.has('sun', 'earth')).toBe(true);
    expect(tracker.create('sun', 'earth', 20)).toBeNull();
    expect(tracker.create('sun', 'sun', 20)).toBeNull();
    expect(tracker.size).toBe(1);
  });

  it('toggles, removes and lists partners', () => {
    const tracker = new ComparisonPairTracker();
    tracker.create('earth', 'sun', 10);
    expect(tracker.partnersOf('earth')).toEqual(['sun']);
    expect(tracker.contains('sun')).toBe(true);
    expect(tracker.toggle('sun', 'earth')).toBe(false);
    expect(tracker.toggle('earth', 'sun', 20)).toBe(true);
    expect(tracker.list()[0].createdAt).toBe(20);
    expect(tracker.remove('mars', 'earth')).toBe(false);
    expect(tracker.remove('earth', 'mars')).toBe(false);
  });

  it('evicts the oldest pair at capacity', () => {
    const tracker = new ComparisonPairTracker(2);
    tracker.create('a', 'b', 1);
    tracker.create('c', 'd', 2);
    tracker.create('e', 'f', 3);
    expect(tracker.has('a', 'b')).toBe(false);
    expect(tracker.list().map((pair) => pair.a)).toEqual(['c', 'e']);
  });

  it('serialises and restores pairs', () => {
    const tracker = new ComparisonPairTracker();
    tracker.create('a', 'b', 10);
    const restored = ComparisonPairTracker.fromJSON(roundTrip(tracker.toJSON()));
    expect(restored.toJSON()).toEqual(tracker.toJSON());
    expect(restored.has('b', 'a')).toBe(true);
    expect(ComparisonPairTracker.fromJSON([{ a: 'x', b: 'x' }]).size).toBe(0);
  });
});

describe('NamedViewCollection', () => {
  it('saves, activates and reads named views', () => {
    const collection = new NamedViewCollection<{ module: string }>();
    const state = { module: 'explorer' };
    collection.save('overview', state, 10);
    expect(collection.activate('overview', 20)).toBe(state);
    expect(collection.get('overview')).toMatchObject({ uses: 1, lastUsedAt: 20, savedAt: 10 });
    expect(collection.activate('missing', 30)).toBeNull();
    expect(collection.names()).toEqual(['overview']);
    expect(collection.list()).toHaveLength(1);
  });

  it('renames and removes views without collisions', () => {
    const collection = new NamedViewCollection<number>();
    collection.save('a', 1, 1);
    collection.save('b', 2, 2);
    expect(collection.rename('a', 'b')).toBe(false);
    expect(collection.rename('a', 'c')).toBe(true);
    expect(collection.has('a')).toBe(false);
    expect(collection.get('c')?.name).toBe('c');
    expect(collection.rename('missing', 'd')).toBe(false);
    expect(collection.remove('c')).toBe(true);
    collection.clear();
    expect(collection.size).toBe(0);
  });

  it('serialises and restores named views', () => {
    const collection = new NamedViewCollection<{ zoom: number }>();
    collection.save('close', { zoom: 4 }, 10);
    collection.activate('close', 20);
    const restored = NamedViewCollection.fromJSON<{ zoom: number }>(roundTrip(collection.toJSON()));
    expect(restored.toJSON()).toEqual(collection.toJSON());
    expect(restored.activate('close', 30)).toEqual({ zoom: 4 });
    expect(NamedViewCollection.fromJSON('bad').size).toBe(0);
  });
});

describe('ChangeDetector', () => {
  it('compares nested structures, NaN and cycles', () => {
    expect(structuralEquals({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(structuralEquals({ a: [1] }, { a: [2] })).toBe(false);
    expect(structuralEquals(Number.NaN, Number.NaN)).toBe(true);
    const left: { self?: unknown } = {};
    const right: { self?: unknown } = {};
    left.self = left;
    right.self = right;
    expect(structuralEquals(left, right)).toBe(true);
  });

  it('diffs added, removed and modified keys', () => {
    expect(diffKeys({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({
      changed: true,
      added: ['c'],
      removed: ['a'],
      modified: ['b'],
    });
    expect(diffKeys({ a: 1 }, { a: 1 }).changed).toBe(false);
    expect(diffKeys({ a: 1 }, { a: 2 }, (x, y) => Math.abs(x - y) < 5).changed).toBe(false);
  });

  it('reports changes only when observed values differ', () => {
    const detector = new ChangeDetector<number[]>();
    expect(detector.observed).toBe(false);
    expect(detector.observe([1, 2])).toBe(true);
    expect(detector.observe([1, 2])).toBe(false);
    expect(detector.observe([1, 3])).toBe(true);
    expect(detector.last).toEqual([1, 3]);
    detector.reset();
    expect(detector.observed).toBe(false);
    expect(detector.observe([1, 3])).toBe(true);
  });

  it('serialises and restores the last observation', () => {
    const detector = new ChangeDetector<{ x: number }>();
    detector.observe({ x: 1 });
    const restored = ChangeDetector.fromJSON<{ x: number }>(roundTrip(detector.toJSON()));
    expect(restored.last).toEqual({ x: 1 });
    expect(restored.observe({ x: 1 })).toBe(false);
    expect(restored.observe({ x: 2 })).toBe(true);
    expect(ChangeDetector.fromJSON('bad').observed).toBe(false);
  });
});

describe('TimeSampleBuffer', () => {
  it('stores samples chronologically in a fixed ring', () => {
    const buffer = new TimeSampleBuffer({ capacity: 3 });
    buffer.push(0, 10);
    buffer.push(1, 20);
    buffer.push(2, 30);
    buffer.push(3, 40);
    expect(buffer.size).toBe(3);
    expect(buffer.toArray()).toEqual([
      { time: 1, value: 20 },
      { time: 2, value: 30 },
      { time: 3, value: 40 },
    ]);
    expect(buffer.at(0)).toEqual({ time: 1, value: 20 });
    expect(buffer.latest()).toEqual({ time: 3, value: 40 });
  });

  it('throttles samples and rejects non-monotonic or invalid values', () => {
    const buffer = new TimeSampleBuffer({ minInterval: 10 });
    expect(buffer.push(0, 1)).toBe(true);
    expect(buffer.push(5, 2)).toBe(false);
    expect(buffer.push(10, 3)).toBe(true);
    expect(buffer.push(9, 4)).toBe(false);
    expect(buffer.push(Number.NaN, 5)).toBe(false);
    expect(buffer.push(20, Number.POSITIVE_INFINITY)).toBe(false);
    expect(buffer.toArray()).toEqual([
      { time: 0, value: 1 },
      { time: 10, value: 3 },
    ]);
  });

  it('interpolates values and reports extent or emptiness', () => {
    const empty = new TimeSampleBuffer();
    expect(empty.valueAt(0)).toBeNull();
    expect(empty.extent()).toBeNull();
    const buffer = new TimeSampleBuffer();
    buffer.push(0, 0);
    buffer.push(10, 100);
    expect(buffer.valueAt(2.5)).toBe(25);
    expect(buffer.valueAt(-1)).toBeNull();
    expect(buffer.valueAt(11)).toBeNull();
    expect(buffer.valueAt(10)).toBe(100);
    expect(buffer.extent()).toEqual({ min: 0, max: 100 });
    buffer.reset();
    expect(buffer.size).toBe(0);
  });

  it('serialises and restores samples', () => {
    const buffer = new TimeSampleBuffer({ capacity: 3 });
    buffer.push(0, 1);
    buffer.push(1, 2);
    const restored = TimeSampleBuffer.fromJSON(roundTrip(buffer.toJSON()), { capacity: 3 });
    expect(restored.toArray()).toEqual(buffer.toArray());
    expect(TimeSampleBuffer.fromJSON([{ time: 'bad', value: 1 }]).size).toBe(0);
  });
});

describe('EventDeduplicator', () => {
  it('suppresses repeat events inside the window and honours its boundary', () => {
    const dedup = new EventDeduplicator<number>(100);
    expect(dedup.accept('a', 1, 0)).toBe(true);
    expect(dedup.accept('a', 2, 50)).toBe(false);
    expect(dedup.get('a')?.value).toBe(1);
    expect(dedup.accept('a', 3, 100)).toBe(true);
    expect(dedup.get('a')?.value).toBe(3);
    expect(dedup.isDuplicate('a', 150)).toBe(true);
    expect(dedup.isDuplicate('a', 200)).toBe(false);
  });

  it('does not extend the window on suppressed events', () => {
    const dedup = new EventDeduplicator<string>(100);
    dedup.accept('tick', 'first', 0);
    dedup.accept('tick', 'ignored', 90);
    expect(dedup.accept('tick', 'second', 101)).toBe(true);
  });

  it('prunes expired keys and forgets explicitly', () => {
    const dedup = new EventDeduplicator<number>(100);
    dedup.accept('a', 1, 0);
    dedup.accept('b', 2, 50);
    expect(dedup.prune(50)).toBe(0);
    expect(dedup.prune(100)).toBe(1);
    expect(dedup.has('a')).toBe(false);
    expect(dedup.forget('b')).toBe(true);
    expect(dedup.forget('b')).toBe(false);
    dedup.clear();
    expect(dedup.size).toBe(0);
  });

  it('evicts the oldest key at capacity', () => {
    const dedup = new EventDeduplicator<number>(1000, 2);
    dedup.accept('a', 1, 0);
    dedup.accept('b', 2, 10);
    dedup.accept('c', 3, 20);
    expect(dedup.keys()).toEqual(['b', 'c']);
    expect(dedup.has('a')).toBe(false);
  });

  it('serialises and restores deduplication state', () => {
    const dedup = new EventDeduplicator<string>(100);
    dedup.accept('a', 'payload', 10);
    const restored = EventDeduplicator.fromJSON<string>(roundTrip(dedup.toJSON()), 100);
    expect(restored.toJSON()).toEqual(dedup.toJSON());
    expect(restored.accept('a', 'other', 50)).toBe(false);
    expect(EventDeduplicator.fromJSON('bad').size).toBe(0);
  });
});

describe('FilterHistory', () => {
  it('applies filters with consecutive deduplication and recall', () => {
    const history = new FilterHistory();
    const first = history.apply('mass>10', ['mass'], 10);
    history.apply('mass>10', ['mass'], 20);
    expect(history.size).toBe(1);
    expect(history.latest()?.appliedAt).toBe(20);
    expect(history.apply('type:star', [], 30).id).toBe('filter-2');
    expect(history.recall(0)?.query).toBe('type:star');
    expect(history.recall(1)).toEqual({ ...first, appliedAt: 20 });
    expect(history.recall(5)).toBeNull();
    expect(history.recall(-1)).toBeNull();
  });

  it('handles empty history, removal and clearing', () => {
    const history = new FilterHistory();
    expect(history.latest()).toBeNull();
    expect(history.recall()).toBeNull();
    const entry = history.apply('all', [], 1);
    expect(history.remove(entry.id)).toBe(true);
    expect(history.remove(entry.id)).toBe(false);
    history.apply('next', [], 2);
    history.clear();
    expect(history.list()).toEqual([]);
  });

  it('evicts the oldest filter at capacity', () => {
    const history = new FilterHistory(2);
    history.apply('one', [], 1);
    history.apply('two', [], 2);
    history.apply('three', [], 3);
    expect(history.list().map((entry) => entry.query)).toEqual(['two', 'three']);
    expect(history.recall(1)?.query).toBe('two');
  });

  it('serialises and restores filters', () => {
    const history = new FilterHistory();
    history.apply('mass>10', ['mass'], 10);
    const restored = FilterHistory.fromJSON(roundTrip(history.toJSON()));
    expect(restored.toJSON()).toEqual(history.toJSON());
    expect(restored.apply('next', [], 20).id).toBe('filter-2');
    expect(FilterHistory.fromJSON('bad').size).toBe(0);
  });
});

describe('TabStateMemory', () => {
  it('remembers and recalls per-tab state', () => {
    const memory = new TabStateMemory<{ scroll: number }>();
    memory.remember('explorer', { scroll: 120 }, 10);
    expect(memory.recall('explorer')).toEqual({ scroll: 120 });
    expect(memory.entry('explorer')?.updatedAt).toBe(10);
    expect(memory.has('explorer')).toBe(true);
    expect(memory.recall('missing')).toBeNull();
    expect(memory.keys()).toEqual(['explorer']);
    expect(memory.list()).toHaveLength(1);
  });

  it('refreshes recency and evicts the least recently used tab', () => {
    const memory = new TabStateMemory<number>(2);
    memory.remember('a', 1, 10);
    memory.remember('b', 2, 20);
    memory.remember('a', 11, 30);
    expect(memory.keys()).toEqual(['b', 'a']);
    memory.remember('c', 3, 40);
    expect(memory.keys()).toEqual(['a', 'c']);
    expect(memory.recall('b')).toBeNull();
    expect(memory.recall('a')).toBe(11);
  });

  it('forgets and clears entries', () => {
    const memory = new TabStateMemory<number>();
    memory.remember('a', 1, 1);
    expect(memory.forget('a')).toBe(true);
    expect(memory.forget('a')).toBe(false);
    memory.remember('b', 2, 2);
    memory.clear();
    expect(memory.size).toBe(0);
  });

  it('serialises and restores tab memory', () => {
    const memory = new TabStateMemory<{ panel: string }>();
    memory.remember('builder', { panel: 'bodies' }, 10);
    const restored = TabStateMemory.fromJSON<{ panel: string }>(roundTrip(memory.toJSON()));
    expect(restored.toJSON()).toEqual(memory.toJSON());
    expect(restored.recall('builder')).toEqual({ panel: 'bodies' });
    expect(TabStateMemory.fromJSON('bad').size).toBe(0);
  });
});
