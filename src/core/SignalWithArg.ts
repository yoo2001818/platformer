export class SignalWithArg<T extends any[]> {
  _onActivate: (() => void) | null;
  _onDeactivate: (() => void) | null;
  listeners: Set<(...args: T) => void>;

  constructor(
    onActivate?: (() => void) | null,
    onDeactivate?: (() => void) | null,
  ) {
    this._onActivate = onActivate ?? null;
    this._onDeactivate = onDeactivate ?? null;
    this.listeners = new Set();
  }

  add(listener: (...args: T) => void): void {
    if (!this.isActive()) {
      this._onActivate?.();
    }
    this.listeners.add(listener);
  }

  remove(listener: (...args: T) => void): void {
    this.listeners.delete(listener);
    if (!this.isActive()) {
      this._onDeactivate?.();
    }
  }

  emit(...args: T): void {
    this.listeners.forEach((listener) => listener(...args));
  }

  isActive(): boolean {
    return this.listeners.size > 0;
  }
}

