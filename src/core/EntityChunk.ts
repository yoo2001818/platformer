import {Entity} from './Entity';
import type {EntityGroup} from './EntityGroup';

export class EntityChunk {
  group: EntityGroup;
  entities: (Entity | null)[];
  componentMap: unknown[];
  maxSize: number;
  size: number;
  defragNeeded: boolean;

  constructor(group: EntityGroup, maxSize: number, protoEntity: Entity) {
    this.group = group;
    this.entities = Array.from({length: maxSize}, () => null);
    this.componentMap = [];
    this.maxSize = maxSize;
    this.size = 0;
    this.defragNeeded = false;
    this.init(protoEntity);
  }

  init(protoEntity: Entity): void {
    protoEntity.store.getComponents().forEach((component) => {
      const value = protoEntity.get(component);
      component.initChunk?.(this, value);
    });
  }

  canAllocate(): boolean {
    return this.size < this.maxSize;
  }

  allocate(entity: Entity): void {
    const offset = this.entities.findIndex((entity) => entity == null);
    this.size += 1;
    // Move all components to the entity chunk
    entity.store.getComponents().forEach((component) => {
      if (component.setChunk != null) {
        const value = component.get(entity);
        component.setChunk(this, offset, value);
      }
    });
    entity.chunk = this;
    entity.chunkOffset = offset;
    entity._markUnfloating();
    this.entities[offset] = entity;
  }

  _handleFloat(entity: Entity): void {
    const offset = entity.chunkOffset;
    entity.chunk = null;
    entity.chunkOffset = 0;
    // Move all components back to the entity chunk
    entity.store.getComponents().forEach((component) => {
      if (component.getChunk != null) {
        const value = component.getChunk(this, offset);
        component.set(entity, value);
      }
    });
    this.entities[offset] = null;
    this.size -= 1;
    this.defragNeeded = true;
    if (this.size === this.maxSize - 1) {
      this.group._handleAvailable(this);
    }
    if (this.size === 0) {
      this.group._handleEmpty(this);
    }
  }

  _handleDelete(entity: Entity): void {
    const offset = entity.chunkOffset;
    entity.chunk = null;
    entity.chunkOffset = 0;
    // Skip copying
    this.entities[offset] = null;
    this.size -= 1;
    this.defragNeeded = true;
    if (this.size === this.maxSize - 1) {
      this.group._handleAvailable(this);
    }
    if (this.size === 0) {
      this.group._handleEmpty(this);
    }
  }

  forEach(callback: (entity: Entity) => void): void {
    this.entities.forEach((entity) => {
      if (entity != null && entity.isValid()) {
        callback(entity);
      }
    });
  }
}
