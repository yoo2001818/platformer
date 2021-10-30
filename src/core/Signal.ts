export class Signal {
  _onActivate: (() => void) | null;
  _onDeactivate: (() => void) | null;
  listeners: Set<() => void>;

  constructor(
    onActivate?: (() => void) | null,
    onDeactivate?: (() => void) | null,
  ) {
    this._onActivate = onActivate ?? null;
    this._onDeactivate = onDeactivate ?? null;
    this.listeners = new Set();
  }

  add(listener: () => void): void {
    if (!this.isActive()) {
      this._onActivate?.();
    }
    this.listeners.add(listener);
  }

  remove(listener: () => void): void {
    this.listeners.delete(listener);
    if (!this.isActive()) {
      this._onDeactivate?.();
    }
  }

  emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  isActive(): boolean {
    return this.listeners.size > 0;
  }
}
