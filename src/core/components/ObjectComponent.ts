import type {Entity} from '../Entity';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export class ObjectComponent<
  TReadValue extends TWriteValue,
  TWriteValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  name: string | null = null;
  index: number | null = null;
  _fromJSON: ((value: TWriteValue) => TReadValue) | null;

  constructor(fromJSON?: (value: TWriteValue) => TReadValue) {
    this._fromJSON = fromJSON ?? null;
  }

  _validateHash(
    entity: Entity,
    prevValue: TWriteValue | null,
    nextValue: TWriteValue | null,
  ): void {
    const prevHash = this.getHashCode(prevValue);
    const nextHash = this.getHashCode(nextValue);
    if (prevHash !== nextHash) {
      entity.float();
    }
  }

  getName(): string | null {
    return this.name;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(storeVal: EntityStore, indexVal: number, nameVal: string): void {
    this.name = nameVal;
    this.index = indexVal;
  }

  unregister(): void {
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
    this._validateHash(
      entity,
      entity._getRawMap(this, null),
      nextValue,
    );
    entity._setRawMap(this, nextValue);
    return nextValue;
  }

  delete(entity: Entity): void {
    this._validateHash(
      entity,
      entity._getRawMap(this, null),
      null,
    );
    entity._setRawMap(this, null);
  }

  getHashCode(value: TWriteValue | null): number {
    return value == null ? 0 : 1;
  }

}
