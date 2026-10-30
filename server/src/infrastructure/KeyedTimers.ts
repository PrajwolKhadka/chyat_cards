export class KeyedTimers {
  private timers = new Map<string, NodeJS.Timeout>();

  set(key: string, ms: number, fn: () => void): void {
    this.clear(key);
    const timer = setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, ms);
    timer.unref();
    this.timers.set(key, timer);
  }

  clear(key: string): void {
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.delete(key);
  }
}