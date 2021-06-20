import type {Entity} from '../Entity';

import {Component} from './Component';

export function createArrayComponent(
  dimensions: number,
): Component<Float32Array> {
  let index: number | null = null;
  function getHashCode(value: Float32Array | null): number {
    return value == null ? 0 : 1;
  }
  function validateHash(
    entity: Entity,
    prevValue: Float32Array | null,
    nextValue: Float32Array | null,
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
      return (entity.componentMap[index!] ?? null) as Float32Array | null;
    },
    set(entity, value) {
      validateHash(entity, entity.componentMap[index!] as Float32Array | null, value);
      entity.componentMap[index!] = value;
    },
    delete(entity) {
      validateHash(entity, entity.componentMap[index!] as Float32Array | null, null);
      entity.componentMap[index!] = null;
    },
    getHashCode(value) {
      return value == null ? 0 : 1;
    },
    initChunk(chunk) {
      chunk.componentMap[index!] = new Float32Array(chunk.maxSize * dimensions);
    },
    getChunk(chunk, offset) {
      const arr = chunk.componentMap[index!] as Float32Array | null;
      if (arr == null) {
        return null;
      }
      return arr.subarray(
        offset * dimensions,
        offset * dimensions + dimensions,
      );
    },
    setChunk(chunk, offset, value) {
      const arr = chunk.componentMap[index!] as Float32Array | null;
      if (arr == null) {
        return;
      }
      arr.set(value, offset * dimensions);
    },
  };
}
