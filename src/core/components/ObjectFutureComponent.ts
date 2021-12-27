import {Entity} from '../Entity';
import {EntityFuture} from '../EntityFuture';
import {EntityStore} from '../EntityStore';

import {Component} from './Component';

export interface ObjectFutureDeserializer<TReadValue, TWriteValue> {
  (
    value: TWriteValue,
    getFuture: (future: EntityFuture | Entity) => Entity,
  ): TReadValue;
}

// FIXME: This is an escape hatch for resolving components with "Future" objects
// which has to be resolved manually. Considering both serialization and this
// in mind, we'd have to re-implement the components.
export class ObjectFutureComponent<
  TReadValue extends TWriteValue,
  TWriteValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  entityStore: EntityStore | null = null;
  name: string | null = null;
  index: number | null = null;
  childrenMap: Map<number | null, Entity[]> = new Map();
  _clone: ((value: TReadValue) => TReadValue);
  _deserialize: ObjectFutureDeserializer<TReadValue, TWriteValue>;

  constructor(
    clone: (value: TReadValue) => TReadValue,
    deserialize: ObjectFutureDeserializer<TReadValue, TWriteValue>,
  ) {
    this._clone = clone;
    this._deserialize = deserialize;
  }

  getName(): string | null {
    return this.name;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number, name: string): void {
    this.entityStore = store;
    this.index = index;
    this.name = name;
    this.childrenMap = new Map();
  }

  unregister(): void {
    this.entityStore = null;
    this.index = null;
  }

  get(entity: Entity): TReadValue | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: TWriteValue): TReadValue {
    const mapped = this._deserialize(value, (future) => {
      if (future instanceof Entity) {
        return future;
      }
      if (this.entityStore?.futureResolver == null) {
        throw new Error('FutureResolver must be defined first before setting');
      }
      return this.entityStore!.futureResolver!(future);
    });
    entity._setHashCode(this.index!, this.getHashCode(value));
    entity._setRawMap(this, mapped);
    return mapped;
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
