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
  index: number | null = null;
  childrenMap: Map<number | null, Entity[]> = new Map();
  _deserialize: ObjectFutureDeserializer<TReadValue, TWriteValue>;

  constructor(deserialize: ObjectFutureDeserializer<TReadValue, TWriteValue>) {
    this._deserialize = deserialize;
  }

  _validateHash(
    entity: Entity,
    prevValue: TReadValue | null,
    nextValue: TReadValue | null,
  ): void {
    const prevHash = this.getHashCode(prevValue);
    const nextHash = this.getHashCode(nextValue);
    if (prevHash !== nextHash) {
      entity.float();
    }
  }

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number): void {
    this.entityStore = store;
    this.index = index;
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
    const prev = entity._getRawMap<TReadValue | null>(this, null);
    this._validateHash(
      entity,
      prev,
      mapped,
    );
    entity._setRawMap(this, mapped);
    return mapped;
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