import {Component} from '../core/components';
import type {Entity} from '../core/Entity';
import type {EntityChunk} from '../core/EntityChunk';

import {Mesh} from './Mesh';

export class MeshComponent implements Component<Mesh> {
  index: number | null;
  constructor() {
    this.index = null;
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

  get(entity: Entity): Mesh | null {

    /*
    if (entity.chunk != null) {
      return this.getChunk(entity.chunk, entity.chunkOffset);
    }
    */
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: Mesh | null): void {
    // Compare hash before writing
    const prevHash = this.getHashCode(this.get(entity));
    const nextHash = this.getHashCode(value);
    if (prevHash !== nextHash) {
      entity.float();
    }

    /*
    if (entity.chunk != null) {
      this.setChunk(entity.chunk, entity.chunkOffset, value);
    }
    */
    entity._setRawMap(this, value);
  }

  delete(entity: Entity): void {
    entity._setRawMap(this, null);
  }

  getHashCode(value: Mesh | null): number {
    // TODO: hashCode must be calculated from the mesh
    return value == null ? 0 : 1;
  }

  /*
  initChunk(chunk: EntityChunk, value: Mesh | null): void {
    if (value == null) {
      // Do nothing if chunk doesn't have mesh
      return;
    }
    chunk._setRawMap(this, value);
  }

  getChunk(chunk: EntityChunk, offset: number): Mesh | null {
    const mesh = chunk._getRawMap<Mesh>(this);
    return mesh;
  }

  setChunk(chunk: EntityChunk, offset: number, value: Mesh | null): void {
    chunk._setRawMap(this, value);
  }
  */
}
