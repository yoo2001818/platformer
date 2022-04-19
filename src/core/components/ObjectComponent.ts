import type {Entity} from '../Entity';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export interface ObjectComponentResolveEntity<TReadValue> {
  (
    value: TReadValue,
    resolveEntity: (entity: Entity | null) => Entity | null,
  ): TReadValue;
}

export class ObjectComponent<
  TReadValue extends TWriteValue,
  TWriteValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  entityStore: EntityStore | null = null;
  name: string | null = null;
  index: number | null = null;
  _clone: ((value: TReadValue) => TReadValue) | null;
  _fromJSON: ((value: TWriteValue) => TReadValue) | null;
  _resolveEntity: ObjectComponentResolveEntity<TReadValue> | null;

  constructor(
    clone?: (value: TReadValue) => TReadValue,
    fromJSON?: (value: TWriteValue) => TReadValue,
    resolveEntity?: ObjectComponentResolveEntity<TReadValue>,
  ) {
    this._clone = clone ?? null;
    this._fromJSON = fromJSON ?? null;
    this._resolveEntity = resolveEntity ?? null;
  }

  getName(): string | null {
    return this.name;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(storeVal: EntityStore, indexVal: number, nameVal: string): void {
    this.entityStore = storeVal;
    this.name = nameVal;
    this.index = indexVal;
  }

  unregister(): void {
    this.entityStore = null;
    this.index = null;
  }

  get(entity: Entity): TReadValue | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: TWriteValue): TReadValue {
    let nextValue: TReadValue;
    if (this._fromJSON != null) {
      nextValue = this._fromJSON(value);
    } else {
      nextValue = value as TReadValue;
    }
    if (this._resolveEntity != null) {
      nextValue = this._resolveEntity(
        nextValue,
        (v) => this.entityStore!.resolveEntity(v),
      );
    }
    entity._setHashCode(this.index!, this.getHashCode(nextValue));
    entity._setRawMap(this, nextValue);
    return nextValue;
  }

  delete(entity: Entity): void {
    entity._setHashCode(this.index!, this.getHashCode(null));
    entity._setRawMap(this, null);
  }

  clone(value: TReadValue): TReadValue {
    if (this._clone == null) {
      return value;
    }
    return this._clone(value);
  }

  getHashCode(value: TWriteValue | null): number {
    return value == null ? 0 : 1;
  }

}
