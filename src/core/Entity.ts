import type {Component} from './components';
import {EntityHandle} from './EntityHandle';
import type {EntityStore} from './EntityStore';
import {getHashCode} from './utils/getHashCode';

export class Entity {
  handle: EntityHandle;
  deleted: boolean;
  floating: boolean;
  componentMap: unknown[];
  store: EntityStore;

  constructor(store: EntityStore, id: number) {
    this.handle = new EntityHandle(id, 0);
    this.deleted = false;
    this.floating = true;
    this.componentMap = [];
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

  isValid(): boolean {
    return !this.deleted;
  }

  float(): void {
    if (!this.floating) {
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
    this.store._handleDestroy(this);
  }

  getHashCode(): number {
    return getHashCode(this, this.store.getComponents());
  }
}
