import type {Entity} from '../Entity';
import type {EntityChunk} from '../EntityChunk';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export class UnisonComponent<
  TReadValue extends TWriteValue,
  TWriteValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  name: string | null = null;
  index: number | null = null;

  allocatedIds: Map<string, number> = new Map();

  _getSignature: (value: TReadValue) => string;
  _fromJSON: ((value: TWriteValue) => TReadValue) | null;

  constructor(
    getSignature: (value: TReadValue) => string,
    fromJSON?: (value: TWriteValue) => TReadValue,
  ) {
    this._getSignature = getSignature;
    this._fromJSON = fromJSON ?? null;
  }

  getName(): string | null {
    return this.name;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number, name: string): void {
    this.name = name;
    this.index = index;
  }

  unregister(): void {
    this.index = null;
  }

  get(entity: Entity): TReadValue | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: TWriteValue): void {
    let nextValue: TReadValue;
    if (this._fromJSON != null) {
      nextValue = this._fromJSON(value);
    } else {
      nextValue = value as TReadValue;
    }
    entity._setHashCode(this.index!, this.getHashCode(nextValue));
    entity._setRawMap(this, nextValue);
  }

  delete(entity: Entity): void {
    entity._setHashCode(this.index!, this.getHashCode(null));
    entity._setRawMap(this, null);
  }

  getHashCode(value: TWriteValue | null): number {
    if (value == null) {
      return 0;
    }
    let nextValue: TReadValue;
    if (this._fromJSON != null) {
      nextValue = this._fromJSON(value);
    } else {
      nextValue = value as TReadValue;
    }
    const signature = this._getSignature(nextValue);
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
