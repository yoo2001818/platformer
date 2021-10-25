import {Component} from './components';
import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';
import {EntityStore} from './EntityStore';

export class EntityGroup {
  store: EntityStore;
  hashCodes: number[];
  chunks: EntityChunk[];
  availableChunks: EntityChunk[];
  version: number;
  componentVersions: number[];

  constructor(store: EntityStore, hashCodes: number[], protoEntity: Entity) {
    this.store = store;
    this.hashCodes = hashCodes;
    this.chunks = [];
    this.availableChunks = [];
    this.version = 0;
    this.componentVersions = [];
    this.init(protoEntity);
  }

  init(protoEntity: Entity): void {
    protoEntity.store.getComponents().forEach((component) => {
      const value = protoEntity.get(component);
      component.initGroup?.(this, value);
    });
  }

  allocate(entity: Entity): EntityChunk {
    if (this.availableChunks.length > 0) {
      const chunk = this.availableChunks[this.availableChunks.length - 1];
      chunk.allocate(entity);
      if (!chunk.canAllocate()) {
        this.availableChunks.pop();
      }
      return chunk;
    }
    const nextSize = this._getNextSize();
    const newChunk = new EntityChunk(this, nextSize, entity);
    newChunk.allocate(entity);
    this.chunks.push(newChunk);
    this.availableChunks.push(newChunk);
    return newChunk;
  }

  has(component: Component<any, any> | string): boolean {
    if (typeof component === 'string') {
      return this.has(this.store.getComponent(component));
    }
    const value = this.hashCodes[component.getIndex()!];
    return value !== undefined && value !== 0;
  }

  _getNextSize(): number {
    const size = this.chunks.length;
    if (size < 5) {
      return 32;
    }
    if (size > 11) {
      return 2048;
    }
    return 1 << size;
  }

  _handleAvailable(chunk: EntityChunk): void {
    this.availableChunks.push(chunk);
  }

  _handleEmpty(chunk: EntityChunk): void {

  }

  forEachChunk(callback: (chunk: EntityChunk) => void): void {
    this.chunks.forEach(callback);
  }

  forEach(callback: (entity: Entity) => void): void {
    this.forEachChunk((chunk) => chunk.forEach(callback));
  }
}
