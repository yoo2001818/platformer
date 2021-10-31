import type {Component} from './components';
import {Entity} from './Entity';
import type {EntityGroup} from './EntityGroup';
import {UpstreamSignal} from './UpstreamSignal';
import {ComponentSignalMapper} from './ComponentSignalMapper';
import {Signal} from './Signal';

export class EntityChunk {
  chunkOffset: number;
  group: EntityGroup;
  entities: (Entity | null)[];
  assignedOffsets: boolean[];
  releasedOffsets: number[];
  componentMap: unknown[];
  maxSize: number;
  size: number;
  maxOffset: number;
  defragNeeded: boolean;
  version: number;
  componentVersions: number[];
  signal: UpstreamSignal;
  componentSignals: ComponentSignalMapper;

  constructor(
    group: EntityGroup,
    chunkOffset: number,
    maxSize: number,
    protoEntity: Entity,
  ) {
    this.group = group;
    this.chunkOffset = chunkOffset;
    this.entities = Array.from({length: maxSize}, () => null);
    this.assignedOffsets = Array.from({length: maxSize}, () => false);
    this.releasedOffsets = [];
    this.componentMap = [];
    this.maxSize = maxSize;
    this.size = 0;
    this.maxOffset = 0;
    this.defragNeeded = false;
    this.version = 0;
    this.componentVersions = [];
    this.signal = new UpstreamSignal(
      () => this.group.signal,
      () => this.version,
    );
    this.componentSignals = new ComponentSignalMapper(
      store,
      this.signal,
      this.componentVersions,
    );
    this.init(protoEntity);
  }

  _getRawMap<T>(component: Component<any>): T {
    const index = component.getIndex();
    if (index == null) {
      throw new Error('Component is not registered');
    }
    return this.componentMap[index] as T;
  }

  _setRawMap<T>(component: Component<any>, value: T): void {
    const index = component.getIndex();
    if (index == null) {
      throw new Error('Component is not registered');
    }
    this.componentMap[index] = value;
  }

  init(protoEntity: Entity): void {
    protoEntity.store.getComponents().forEach((component) => {
      const value = protoEntity.get(component);
      component.initChunk?.(this, value);
    });
  }

  isValid(offset: number): boolean {
    return this.assignedOffsets[offset];
  }

  getAt(offset: number): Entity | null {
    return this.entities[offset];
  }

  canAllocate(): boolean {
    return this.size < this.maxSize;
  }

  allocate(entity: Entity): void {
    let offset: number;
    if (this.releasedOffsets.length > 0) {
      offset = this.releasedOffsets.pop()!;
      if (this.releasedOffsets.length === 0) {
        this.defragNeeded = false;
      }
    } else {
      offset = this.maxOffset;
      this.maxOffset += 1;
    }
    this.size += 1;
    // Move all components to the entity chunk
    entity.store.getComponents().forEach((component) => {
      if (component.setChunk != null) {
        const value = component.get(entity);
        if (value != null) {
          component.setChunk(this, offset, value);
        }
      }
    });
    entity.chunk = this;
    entity.chunkOffset = offset;
    entity._markUnfloating();
    this.entities[offset] = entity;
    this.assignedOffsets[offset] = true;
  }

  has(component: Component<any, any> | string): boolean {
    return this.group.has(component);
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
    this.assignedOffsets[offset] = false;
    this.size -= 1;
    if (offset >= this.maxOffset - 1) {
      this.maxOffset = offset;
    } else {
      this.releasedOffsets.push(offset);
      this.defragNeeded = true;
    }
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
    this.assignedOffsets[offset] = false;
    this.size -= 1;
    if (offset >= this.maxOffset) {
      this.maxOffset = offset - 1;
    } else {
      this.releasedOffsets.push(offset);
      this.defragNeeded = true;
    }
    if (this.size === this.maxSize - 1) {
      this.group._handleAvailable(this);
    }
    if (this.size === 0) {
      this.group._handleEmpty(this);
    }
  }

  forEach(callback: (entity: Entity, offset: number) => void): void {
    for (let i = 0; i < this.maxOffset; i += 1) {
      if (this.assignedOffsets[i]) {
        callback(this.entities[i]!, i);
      }
    }
    // this.entities.forEach((entity, offset) => {
    //   if (entity != null) {
    //     callback(entity, offset);
    //   }
    // });
  }

  _propagateUpdates(offset: number, version: number, index: number): void {
    this.version = version;
    this.componentVersions[index] = version;
    this.group._propagateUpdates(this.chunkOffset, version, index);
  }

  getComponentSignal(component: Component<any, any> | string | number): Signal {
    return this.componentSignals.get(component);
  }
}
