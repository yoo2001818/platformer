import type {Entity} from '../Entity';
import {EntityChunk} from '../EntityChunk';

import {Component} from './Component';

export class Float32ArrayComponent implements Component<Float32Array> {
  index: number | null;
  dimensions: number;
  constructor(dimensions: number) {
    this.index = null;
    this.dimensions = dimensions;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(storeVal, indexVal): void {
    this.index = indexVal;
  }

  unregister(): void {
    this.index = null;
  }

  get(entity: Entity): Float32Array | null {
    if (entity.chunk != null) {
      return this.getChunk(entity.chunk, entity.chunkOffset);
    }
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: Float32Array | null): void {
    // Compare hash before writing
    const prevHash = this.getHashCode(this.get(entity));
    const nextHash = this.getHashCode(value);
    if (prevHash !== nextHash) {
      entity.float();
    }
    if (entity.chunk != null) {
      this.setChunk(entity.chunk, entity.chunkOffset, value);
    }
    entity._setRawMap(this, value);
  }

  delete(entity: Entity): void {
    entity._setRawMap(this, null);
  }

  getHashCode(value: Float32Array | null): number {
    return value == null ? 0 : 1;
  }

  initChunk(chunk: EntityChunk, value: Float32Array): void {
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
