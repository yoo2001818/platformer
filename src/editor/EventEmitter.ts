export class EventEmitter {
  listeners: Map<string, Set<(...args: any[]) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  _getListeners(type: string): Set<(...args: any[]) => void> {
    const listeners = this.listeners.get(type);
    if (listeners == null) {
      const newListeners: Set<(...args: any[]) => void> = new Set();
      this.listeners.set(type, newListeners);
      return newListeners;
    }
    return listeners;
  }

  on(type: string, callback: (...args: any[]) => void): void {
    this._getListeners(type).add(callback);
  }

  off(type: string, callback: (...args: any[]) => void): void {
    this._getListeners(type).delete(callback);
  }

  emit(type: string, args: any[]): void {
    this._getListeners(type).forEach((listener) => listener(...args));
    this._getListeners('all').forEach((listener) => listener(type, ...args));
  }
}
