import type {Entity} from '../Entity';
import type {EntityChunk} from '../EntityChunk';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export class UnisonComponent<
  TReadValue,
  TWriteValue extends TReadValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  index: number | null = null;

  allocatedIds: Map<string, number> = new Map();

  _getSignature: (value: TReadValue) => string;

  constructor(getSignature: (value: TReadValue) => string) {
    this._getSignature = getSignature;
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

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number): void {
    this.index = index;
  }

  unregister(): void {
    this.index = null;
  }

  get(entity: Entity): TReadValue | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: TWriteValue): void {
    this._validateHash(
      entity,
      entity._getRawMap(this, null),
      value,
    );
    entity._setRawMap(this, value);
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
    if (value == null) {
      return 0;
    }
    const signature = this._getSignature(value);
    let id = this.allocatedIds.get(signature);
    if (id != null) {
      return id;
    }
    id = this.allocatedIds.size + 1;
    this.allocatedIds.set(signature, id);
    return id;
  }

  initChunk(chunk: EntityChunk, value: TReadValue | null): void {
    chunk._setRawMap(this, value);
  }

  getChunk(chunk: EntityChunk, offset: number): TReadValue | null {
    return chunk._getRawMap(this);
  }

  setChunk(chunk: EntityChunk, offset: number, value: TWriteValue): void {
    // Do nothing. :/
  }
}
