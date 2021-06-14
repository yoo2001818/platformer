import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';

export class EntityGroup {
  hashCode: number;
  componentHashCodes: number[];
  chunks: EntityChunk[];
  availableChunks: EntityChunk[];

  constructor(hashCode: number, componentHashCodes: number[]) {
    this.hashCode = hashCode;
    this.componentHashCodes = componentHashCodes;
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
    const newChunk = new EntityChunk(this, 32, entity);
    newChunk.allocate(entity);
    this.chunks.push(newChunk);
    this.availableChunks.push(newChunk);
    return newChunk;
  }

  _handleAvailable(chunk: EntityChunk): void {
    this.availableChunks.push(chunk);
  }

  _handleEmpty(chunk: EntityChunk): void {

  }
}
