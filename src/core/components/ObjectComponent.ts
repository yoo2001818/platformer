import type {Entity} from '../Entity';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export class ObjectComponent<
  TReadValue,
  TWriteValue extends TReadValue = TReadValue
> implements Component<TReadValue, TWriteValue> {

  index: number | null = null;

  constructor() {
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
    const {index} = this;
    return (entity.componentMap[index!] ?? null) as TReadValue | null;
  }

  set(entity: Entity, value: TWriteValue): void {
    const {index} = this;
    this._validateHash(
      entity,
      entity.componentMap[index!] as TWriteValue | null,
      value,
    );
    entity.componentMap[index!] = value;
  }

  delete(entity: Entity): void {
    const {index} = this;
    this._validateHash(
      entity,
      entity.componentMap[index!] as TWriteValue | null,
      null,
    );
    entity.componentMap[index!] = null;
  }

  getHashCode(value: TWriteValue | null): number {
    return value == null ? 0 : 1;
  }

}
