import {EntityChunk} from './EntityChunk';

export class EntityGroup {
  hashCode: number;
  chunks: EntityChunk[];

  constructor(hashCode: number) {
    this.hashCode = hashCode;
  }
}
