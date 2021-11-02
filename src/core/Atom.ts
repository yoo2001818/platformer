import {EntityStore} from './EntityStore';
import {UpstreamSignal} from './UpstreamSignal';

export interface AtomDescriptor<T> {
  name: string;
  defaultState: T;
}

export class Atom<T> {
  name: string;
  state: T;
  entityStore: EntityStore;
  version: number;
  signal: UpstreamSignal;

  constructor(
    descriptor: AtomDescriptor<T>,
    entityStore: EntityStore,
  ) {
    this.name = descriptor.name;
    this.state = descriptor.defaultState;
    this.entityStore = entityStore;
    this.version = 0;
    this.signal = new UpstreamSignal(
      () => entityStore.signal,
      () => this.version,
    );
  }

  setState(state: T): void {
    this.state = state;
    this.markChanged();
  }

  markChanged(): void {
    this.version = this.entityStore.nextVersion();
  }
}

export function atom<T>(descriptor: AtomDescriptor<T>): AtomDescriptor<T> {
  return descriptor;
}
