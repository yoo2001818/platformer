import type {Component} from './components';
import type {EntityChunk} from './EntityChunk';
import {EntityHandle} from './EntityHandle';
import type {EntityStore} from './EntityStore';

export class Entity {
  handle: EntityHandle;
  deleted: boolean;
  floating: boolean;
  componentMap: unknown[];
  chunk: EntityChunk | null;
  chunkOffset: number;
  store: EntityStore;

  constructor(store: EntityStore, id: number) {
    this.handle = new EntityHandle(id, 0);
    this.deleted = false;
    this.floating = true;
    this.componentMap = [];
    this.chunk = null;
    this.chunkOffset = 0;
    this.store = store;
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
  }

  _markUnfloating(): void {
    this.floating = false;
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

  get<TReadValue>(
    component: Component<TReadValue> | string,
  ): TReadValue | null {
    if (typeof component === 'string') {
      return this.get(this.store.getComponent(component));
    }
    return component.get(this);
  }

  set<TWriteValue>(
    component: Component<any, TWriteValue> | string,
    value: TWriteValue,
  ): void {
    if (typeof component === 'string') {
      return this.set(this.store.getComponent(component), value);
    }
    return component.set(this, value);
  }

  delete(component: Component<any> | string): void {
    if (typeof component === 'string') {
      return this.delete(this.store.getComponent(component));
    }
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

  getHashCodes(): number[] {
    return this.store.getComponents().map((component) => {
      return component.getHashCode(this);
    });
  }
}