import type {Entity} from '../Entity';

import {Component} from './Component';

export function createComponent<TValue>(): Component<TValue> {
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
    getIndex() {
      return index;
    },
    register(storeVal, indexVal) {
      index = indexVal;
    },
    unregister() {
      index = null;
    },
    get(entity) {
      return (entity.componentMap[index!] ?? null) as TValue | null;
    },
    set(entity, value) {
      validateHash(entity, entity.componentMap[index!] as TValue | null, value);
      entity.componentMap[index!] = value;
    },
    delete(entity) {
      validateHash(entity, entity.componentMap[index!] as TValue | null, null);
      entity.componentMap[index!] = null;
    },
    getHashCode(value) {
      return value == null ? 0 : 1;
    },
  };
}