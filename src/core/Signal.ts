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
    if (this.listeners.size === 0) {
      this._onActivate?.();
    }
    this.listeners.add(listener);
  }

  remove(listener: () => void): void {
    this.listeners.delete(listener);
    if (this.listeners.size === 0) {
      this._onDeactivate?.();
    }
  }

  emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
