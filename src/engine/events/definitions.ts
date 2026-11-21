/** Typed event definitions and deterministic event construction. */
import { resolvePriority } from './priority';
import {
  finiteNumber,
  positiveInt,
  type SimulationEvent,
  type SimulationEventMap,
  type SimulationEventName,
} from './types';

export type EventCategory = 'collision' | 'orbit' | 'dynamics' | 'simulation';

export interface EventDefinition<K extends SimulationEventName = SimulationEventName> {
  readonly name: K;
  readonly priority: number;
  readonly category: EventCategory;
  readonly description: string;
}

export const EVENT_DEFINITIONS: { readonly [K in SimulationEventName]: EventDefinition<K> } = {
  collision: {
    name: 'collision',
    priority: 100,
    category: 'collision',
    description: 'Two bodies overlapped and a collision response was selected.',
  },
  closeApproach: {
    name: 'closeApproach',
    priority: 10,
    category: 'orbit',
    description: 'Two predicted paths reached a closest sampled separation.',
  },
  escape: {
    name: 'escape',
    priority: 10,
    category: 'dynamics',
    description: 'A body reached non-negative two-body specific orbital energy.',
  },
  capture: {
    name: 'capture',
    priority: 10,
    category: 'dynamics',
    description: 'A previously unbound body became bound to a primary.',
  },
  crossing: {
    name: 'crossing',
    priority: 0,
    category: 'dynamics',
    description: 'A body crossed an axis-aligned coordinate plane.',
  },
  tick: {
    name: 'tick',
    priority: -100,
    category: 'simulation',
    description: 'The solver advanced by one step.',
  },
};

/** Looks up a definition, with a finite-safe fallback for merged custom events. */
export function getEventDefinition<K extends SimulationEventName>(name: K): EventDefinition<K> {
  const definition = (EVENT_DEFINITIONS as Record<string, EventDefinition>)[name];
  if (definition) return definition as EventDefinition<K>;
  return {
    name,
    priority: 0,
    category: 'simulation',
    description: 'Custom simulation event.',
  };
}

/** Creates a definition for a built-in or declaration-merged event name. */
export function defineEvent<K extends SimulationEventName>(
  name: K,
  overrides: Partial<Omit<EventDefinition<K>, 'name'>> = {},
): EventDefinition<K> {
  const base = getEventDefinition(name);
  return {
    name,
    priority: resolvePriority(overrides.priority, base.priority),
    category: overrides.category ?? base.category,
    description: overrides.description ?? base.description,
  };
}

export interface CreateEventOptions {
  time?: number;
  priority?: number;
  id?: string;
  sequence?: number;
}

let sequence = 0;

/** Monotonic sequence used to break priority ties deterministically. */
export function nextEventSequence(): number {
  sequence += 1;
  return sequence;
}

/** Test helper that restarts sequence numbering and generated ids. */
export function resetEventSequences(): void {
  sequence = 0;
}

/** Builds a fully populated event, sanitising all timing and priority fields. */
export function createSimulationEvent<K extends SimulationEventName>(
  type: K,
  payload: SimulationEventMap[K],
  options: CreateEventOptions = {},
): SimulationEvent<K> {
  const eventSequence = positiveInt(options.sequence ?? nextEventSequence(), 1);
  const time = finiteNumber(options.time);
  const priority = resolvePriority(options.priority, getEventDefinition(type).priority);
  const id = typeof options.id === 'string' && options.id.length > 0 ? options.id : `${type}-${eventSequence}`;
  return { type, payload, time, sequence: eventSequence, priority, id };
}
