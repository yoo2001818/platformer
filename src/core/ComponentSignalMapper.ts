import {Component} from './components';
import {EntityStore} from './EntityStore';
import {Signal} from './Signal';
import {UpstreamSignal} from './UpstreamSignal';

export class ComponentSignalMapper {
  store: EntityStore;
  wrapperSignal: Signal;
  signals: Signal[];
  getVersionCallback: (index: number) => number | null | undefined;

  constructor(
    store: EntityStore,
    wrapperSignal: Signal,
    getVersionCallback: (index: number) => number | null | undefined,
  ) {
    this.store = store;
    this.wrapperSignal = wrapperSignal;
    this.signals = [];
    this.getVersionCallback = getVersionCallback;
  }

  getIndex(index: number): Signal {
    if (this.signals[index] != null) {
      return this.signals[index];
    }
    const newSignal = new UpstreamSignal(
      () => this.wrapperSignal,
      () => this.getVersionCallback(index) ?? -1,
    );
    this.signals[index] = newSignal;
    return newSignal;
  }

  get(component: Component<any, any> | string | number): Signal {
    if (typeof component === 'string') {
      return this.get(this.store.getComponent(component));
    }
    if (typeof component === 'number') {
      return this.getIndex(component);
    }
    return this.getIndex(component.getIndex()!);
  }
}
