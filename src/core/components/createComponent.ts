import type {Entity} from '../Entity';
import {EntityStore} from '../EntityStore';

import {Component} from './Component';

export function createComponent<TValue>(): Component<TValue> {
  let store: EntityStore | null = null;
  let index: number | null = null;
  function getHashCode(value: TValue | null): number {
    return value == null ? 0 : 1;
  }
  function validateHash(
    entity: Entity,
    prevValue: TValue | null,
    nextValue: TValue | null,
  ): void {
    const prevHash = getHashCode(prevValue);
    const nextHash = getHashCode(nextValue);
    if (prevHash !== nextHash) {
      entity.float();
    }
  }
  return {
    register(storeVal, indexVal) {
      store = storeVal;
      index = indexVal;
    },
    unregister() {
      store = null;
      index = null;
    },
    get(entity) {
      return (entity.componentMap[index] ?? null) as TValue | null;
    },
    set(entity, value) {
      validateHash(entity, entity.componentMap[index] as TValue | null, value);
      entity.componentMap[index] = value;
    },
    delete(entity) {
      validateHash(entity, entity.componentMap[index] as TValue | null, null);
      entity.componentMap[index] = null;
    },
    getHashCode(value) {
      return value == null ? 0 : 1;
    },
    initChunk(chunk) {
    },
    moveToChunk(entity, chunk, offset) {
    },
    moveFromChunk(entity, chunk, offset) {
    },
    getChunk(chunk, offset) {
    },
  };
}
