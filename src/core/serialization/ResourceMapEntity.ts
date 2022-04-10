import {Engine} from '../Engine';
import {Entity} from '../Entity';

import {
  ResourceMap,
  ResourceMapComponent,
  ResourceMapDescriptor,
} from './ResourceMap';

export class ResourceMapEntityComponent implements ResourceMapComponent {
  engine: Engine;
  resourceMap: ResourceMap;
  entities: Entity[];
  reverseMap: Map<number, number>;
  json: unknown | null;

  constructor(engine: Engine, resourceMap: ResourceMap, json?: unknown) {
    this.engine = engine;
    this.resourceMap = resourceMap;
    this.entities = [];
    this.reverseMap = new Map();
    this.json = json;
  }

  _updateReverseMap(): void {
    this.reverseMap.clear();
    this.entities.forEach((entity, i) => {
      this.reverseMap.set(entity.handle.id, i);
    });
  }

  load(): void {
    const {json} = this;
    if (json == null) {
      return;
    }
    if (Array.isArray(json)) {
      const jsonArr = json as unknown[];
      // Load in 2-step process; first, generate the empty entities to allocate
      // IDs...
      this.entities = jsonArr.map(() => this.engine.entityStore.create());
      this._updateReverseMap();
      // Second, dump json data onto each entity
      jsonArr.forEach((data, i) => {
        this.entities[i].fromJSON(this.resourceMap, data);
      });
    }
    this.json = null;
  }

  addEntity(entity: Entity): void {
    this.getIndex(entity);
  }

  addEntities(entities: Entity[]): void {
    entities.forEach((entity) => this.addEntity(entity));
  }

  getIndex(entity: Entity): number {
    const index = this.reverseMap.get(entity.handle.id);
    if (index != null) {
      return index;
    }
    const newIndex = this.entities.length;
    this.entities.push(entity);
    this.reverseMap.set(entity.handle.id, newIndex);
    return newIndex;
  }

  getEntity(index: number): Entity {
    return this.entities[index];
  }

  toJSON(): unknown {
    return this.entities
      .map((entity) => entity.toJSON(this.resourceMap));
  }
}

export const resourceMapEntity:
ResourceMapDescriptor<ResourceMapEntityComponent> = {
  name: 'entities',
  create(engine, resourceMap, json) {
    return new ResourceMapEntityComponent(engine, resourceMap, json);
  },
};
