import type {Component} from './components';
import {ComponentSignalMapper} from './ComponentSignalMapper';
import type {EntityChunk} from './EntityChunk';
import {EntityHandle} from './EntityHandle';
import type {EntityStore} from './EntityStore';
import {Signal} from './Signal';
import {UpstreamSignal} from './UpstreamSignal';

export class Entity {
  handle: EntityHandle;
  deleted: boolean;
  floating: boolean;
  version: number;
  structureVersion: number;
  componentVersions: number[];
  componentMap: unknown[];
  hashCodes: number[];
  chunk: EntityChunk | null;
  chunkOffset: number;
  store: EntityStore;
  signal: UpstreamSignal;
  componentSignals: ComponentSignalMapper;

  constructor(store: EntityStore, id: number) {
    this.handle = new EntityHandle(id, 0);
    this.deleted = false;
    this.floating = true;
    this.version = 0;
    this.structureVersion = 0;
    this.componentVersions = [];
    this.componentMap = [];
    this.hashCodes = [];
    this.chunk = null;
    this.chunkOffset = 0;
    this.store = store;
    this.signal = new UpstreamSignal(
      () => {
        if (this.chunk != null) {
          return this.chunk.signal;
        }
        return this.store.signal;
      },
      () => this.version,
    );
    this.componentSignals = new ComponentSignalMapper(
      store,
      this.signal,
      this.componentVersions,
    );
  }

  _markUndeleted(): void {
    this.deleted = false;
    this.handle = this.handle.incrementVersion();
    this.clear();
    this._markFloating();
  }

  _markDeleted(): void {
    this.deleted = true;
  }

  _markFloating(): void {
    this.store._handleFloat(this);
    this.floating = true;
    this.markStructureChanged();
    this.signal.updateUpstream();
  }

  _markUnfloating(): void {
    this.floating = false;
    this.markStructureChanged();
    this.signal.updateUpstream();
  }

  _getRawMap<T>(component: Component<any>, initialValue: T): T {
    const index = component.getIndex();
    if (index == null) {
      throw new Error('Component is not registered');
    }
    const value = this.componentMap[index];
    if (value === undefined) {
      return initialValue;
    }
    return value as T;
  }

  _setRawMap<T>(component: Component<any>, value: T): void {
    const index = component.getIndex();
    if (index == null) {
      throw new Error('Component is not registered');
    }
    this.componentMap[index] = value;
  }

  _setHashCode(index: number, hashCode: number): void {
    if (this.hashCodes[index] !== hashCode) {
      this.markStructureChanged();
      this.float();
    }
    this.hashCodes[index] = hashCode;
  }

  isValid(): boolean {
    return !this.deleted;
  }

  float(): void {
    if (!this.floating) {
      if (this.chunk != null) {
        this.chunk._handleFloat(this);
      }
      this._markFloating();
    }
  }

  has(
    component: Component<any, any> | string,
  ): boolean {
    if (typeof component === 'string') {
      return this.has(this.store.getComponent(component));
    }
    return component.get(this) != null;
  }

  get<TReadValue>(
    component: Component<TReadValue, any> | string,
  ): TReadValue | null {
    if (typeof component === 'string') {
      return this.get(this.store.getComponent(component));
    }
    return component.get(this);
  }

  getMutate<TReadValue>(
    component: Component<TReadValue, any> | string,
  ): TReadValue | null {
    if (typeof component === 'string') {
      return this.getMutate(this.store.getComponent(component));
    }
    this.markChanged(component);
    return this.get(component);
  }

  set<TWriteValue>(
    component: Component<any, TWriteValue> | string,
    value: TWriteValue,
  ): void {
    if (typeof component === 'string') {
      return this.set(this.store.getComponent(component), value);
    }
    this.markChanged(component);
    return component.set(this, value);
  }

  markChanged(component: Component<any, any> | string): void {
    if (typeof component === 'string') {
      this.markChanged(this.store.getComponent(component));
    } else {
      const currentVersion = this.store.nextVersion();
      const index = component.getIndex()!;
      this.version = currentVersion;
      this.componentVersions[index] = currentVersion;
      if (this.chunk != null) {
        this.chunk._propagateUpdates(this.chunkOffset, currentVersion, index);
      }
    }
  }

  markStructureChanged(): void {
    const currentVersion = this.store.nextVersion();
    this.version = currentVersion;
    this.structureVersion = currentVersion;
    if (this.chunk != null) {
      this.chunk._propagateStructureUpdates(this.chunkOffset, currentVersion);
    }
  }

  delete(component: Component<any> | string): void {
    if (typeof component === 'string') {
      return this.delete(this.store.getComponent(component));
    }
    this.markChanged(component);
    return component.delete(this);
  }

  clear(): void {
    this.store.getComponents().forEach((component) => {
      component.delete(this);
    });
  }

  destroy(): void {
    if (!this.deleted) {
      this.store._handleDestroy(this);
      if (this.chunk != null) {
        this.chunk._handleDelete(this);
      }
    }
  }

  setMap(options: {[key: string]: any;}): void {
    Object.keys(options).forEach((key) => {
      // Ignore 'handle' - it's reserved for marking IDs
      if (key === 'handle') {
        return;
      }
      this.set(key, options[key]);
    });
  }

  getMap(): {[key: string]: any;} {
    const result: {[key: string]: any;} = {};
    this.store.getComponents().forEach((component) => {
      result[component.getName()!] = component.get(this);
    });
    return result;
  }

  getHashCodes(): number[] {
    return this.hashCodes;
  }

  getEntries(): [string, any][] {
    const output: [string, any][] = [];
    this.store.getComponents().forEach((component) => {
      const value = component.get(this);
      if (value != null) {
        output.push([component.getName()!, value]);
      }
    });
    return output;
  }

  toJSON(): {[key: string]: unknown;} {
    const result: {[key: string]: any;} = {};
    result.handle = this.handle;
    this.store.getComponents().forEach((component) => {
      const name = component.getName()!;
      if (component.toJSON != null) {
        result[name] = component.toJSON(this);
      } else {
        let value = component.get(this);
        const valueJSONable = value as {toJSON(): unknown;};
        if (value != null && typeof valueJSONable.toJSON === 'function') {
          value = valueJSONable.toJSON();
        }
        result[name] = value;
      }
    });
    return result;
  }

  getComponentSignal(component: Component<any, any> | string | number): Signal {
    return this.componentSignals.get(component);
  }

  getComponentVersion(
    component: Component<any, any> | string | number,
  ): number {
    if (typeof component === 'string') {
      return this.getComponentVersion(this.store.getComponent(component));
    }
    if (typeof component === 'number') {
      return this.componentVersions[component] ?? 0;
    }
    return this.getComponentVersion(component.getIndex()!);
  }
}
