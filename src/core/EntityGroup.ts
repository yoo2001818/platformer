import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';

export class EntityGroup {
  hashCodes: number[];
  chunks: EntityChunk[];
  availableChunks: EntityChunk[];

  constructor(hashCodes: number[]) {
    this.hashCodes = hashCodes;
    this.chunks = [];
    this.availableChunks = [];
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
