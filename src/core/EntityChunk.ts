import {Entity} from './Entity';

export class EntityChunk {
  entities: Entity[];
  componentMap: unknown[];

  constructor() {
    this.entities = [];
    this.componentMap = [];
  }
}
