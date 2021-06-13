import {EntityStore} from '../EntityStore';

import {Component} from './Component';

export function createComponent<TValue>(): Component<TValue> {
  let store: EntityStore | null = null;
  let index: number | null = null;
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
      entity.componentMap[index] = value;
    },
    delete(entity) {
      entity.componentMap[index] = null;
    },
    getHashCode(entity) {
      return entity.componentMap[index] == null ? 0 : 1;
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
