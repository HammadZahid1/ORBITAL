/** Idempotent, pausable handles returned by event subscriptions. */

export class Subscription {
  private active = true;
  private enabled = true;

  constructor(private readonly onDispose: () => void = () => undefined) {}

  get closed(): boolean {
    return !this.active;
  }

  get paused(): boolean {
    return this.active && !this.enabled;
  }

  isEnabled(): boolean {
    return this.active && this.enabled;
  }

  unsubscribe(): void {
    if (!this.active) return;
    this.active = false;
    this.enabled = false;
    this.onDispose();
  }

  pause(): void {
    if (this.active) this.enabled = false;
  }

  resume(): void {
    if (this.active) this.enabled = true;
  }

  /** Owner-initiated teardown that does not call back into the owner. */
  dispose(): void {
    this.active = false;
    this.enabled = false;
  }
}

/** Groups handles so a single call tears down every child subscription. */
export class SubscriptionGroup {
  private readonly children = new Set<Subscription>();

  constructor(subscriptions: readonly Subscription[] = []) {
    for (const subscription of subscriptions) this.add(subscription);
  }

  add(subscription: Subscription): Subscription {
    this.children.add(subscription);
    return subscription;
  }

  remove(subscription: Subscription): boolean {
    return this.children.delete(subscription);
  }

  pause(): void {
    for (const subscription of this.children) subscription.pause();
  }

  resume(): void {
    for (const subscription of this.children) subscription.resume();
  }

  unsubscribe(): void {
    for (const subscription of this.children) subscription.unsubscribe();
    this.children.clear();
  }

  get size(): number {
    return this.children.size;
  }
}

/** Convenience combinator for callers that do not need a group object. */
export function combineSubscriptions(...subscriptions: Subscription[]): Subscription {
  const group = new SubscriptionGroup(subscriptions);
  const handle = new Subscription(() => group.unsubscribe());
  return handle;
}
