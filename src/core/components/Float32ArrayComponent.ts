import type {Entity} from '../Entity';
import {EntityChunk} from '../EntityChunk';
import type {EntityStore} from '../EntityStore';

import {Component} from './Component';

export class Float32ArrayComponent
  implements Component<Float32Array, Float32Array | number[]> {
  index: number | null;
  dimensions: number;
  constructor(dimensions: number) {
    this.index = null;
    this.dimensions = dimensions;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(storeVal: EntityStore, indexVal: number): void {
    this.index = indexVal;
  }

  unregister(): void {
    this.index = null;
  }

  toJSON(entity: Entity): number[] | null {
    const value = this.get(entity);
    if (value != null) {
      return Array.from(value);
    }
    return null;
  }

  get(entity: Entity): Float32Array | null {
    if (entity.chunk != null) {
      return this.getChunk(entity.chunk, entity.chunkOffset);
    }
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: Float32Array | number[]): void {
    if (Array.isArray(value)) {
      this.set(entity, new Float32Array(value));
      return;
    }
    // Compare hash before writing
    const prevHash = this.getHashCode(this.get(entity));
    const nextHash = this.getHashCode(value);
    if (prevHash !== nextHash) {
      entity.float();
    }
    if (entity.chunk != null) {
      if (value != null) {
        this.setChunk(entity.chunk, entity.chunkOffset, value);
      }
    } else {
      entity._setRawMap(this, value);
    }
  }

  delete(entity: Entity): void {
    entity._setRawMap(this, null);
  }

  getHashCode(value: Float32Array | null): number {
    return value == null ? 0 : 1;
  }

  getChunkArray(chunk: EntityChunk): Float32Array | null {
    return chunk._getRawMap<Float32Array>(this);
  }

  initChunk(chunk: EntityChunk, value: Float32Array | null): void {
    if (value == null) {
      // Do nothing if chunk doesn't have Float32Array
      return;
    }
    chunk._setRawMap(this, new Float32Array(chunk.maxSize * this.dimensions));
  }

  getChunk(chunk: EntityChunk, offset: number): Float32Array | null {
    const {dimensions} = this;
    const arr = chunk._getRawMap<Float32Array>(this);
    if (arr == null) {
      return null;
    }
    return arr.subarray(
      offset * dimensions,
      offset * dimensions + dimensions,
    );
  }

  setChunk(chunk: EntityChunk, offset: number, value: Float32Array): void {
    const {dimensions} = this;
    const arr = chunk._getRawMap<Float32Array>(this);
    if (arr == null) {
      throw new Error('The EntityChunk\'s array is not initialized');
    }
    const slicedValue = value.subarray(0, dimensions);
    arr.set(slicedValue, offset * dimensions);
  }
}
