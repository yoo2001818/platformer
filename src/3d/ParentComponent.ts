import {Component} from '../core/components';
import {Entity} from '../core/Entity';
import {EntityChunk} from '../core/EntityChunk';
import {EntityGroup} from '../core/EntityGroup';
import {EntityStore} from '../core/EntityStore';

// TODO: Change this to accept EntityHandle
export class ParentComponent
  implements Component<Entity | null, Entity | null> {

  index: number | null = null;
  childrenMap: Map<number | null, EntityGroup[]> = new Map();

  _validateHash(
    entity: Entity,
    prevValue: Entity | null,
    nextValue: Entity | null,
  ): void {
    const prevHash = this.getHashCode(prevValue);
    const nextHash = this.getHashCode(nextValue);
    if (prevHash !== nextHash) {
      entity.float();
    }
  }

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number): void {
    this.index = index;
    this.childrenMap = new Map();
  }

  unregister(): void {
    this.index = null;
  }

  get(entity: Entity): Entity | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: Entity): void {
    this._validateHash(
      entity,
      entity._getRawMap(this, null),
      value,
    );
    entity._setRawMap(this, value);
  }

  delete(entity: Entity): void {
    this._validateHash(
      entity,
      entity._getRawMap(this, null),
      null,
    );
    entity._setRawMap(this, null);
  }

  getHashCode(value: Entity | null): number {
    if (value == null) {
      return -1;
    }
    return value.handle.id;
  }

  initChunk(chunk: EntityChunk, value: Entity | null): void {
    chunk._setRawMap(this, value);
  }

  getChunk(chunk: EntityChunk, offset: number): Entity | null {
    return chunk._getRawMap(this);
  }

  setChunk(chunk: EntityChunk, offset: number, value: Entity | null): void {
    // Do nothing. :/
  }

  initGroup(group: EntityGroup, value: Entity | null): void {
    const id = value?.handle.id ?? null;
    let groupList = this.childrenMap.get(id);
    if (groupList == null) {
      groupList = [];
      this.childrenMap.set(id, groupList);
    }
    groupList.push(group);
  }

  getChildren(parent: Entity | null): EntityGroup[] {
    const id = parent?.handle.id ?? null;
    const groupList = this.childrenMap.get(id);
    return groupList ?? [];
  }

  forEachChildren(
    parent: Entity | null,
    callback: (entity: Entity) => void,
  ): void {
    this.getChildren(parent).forEach((group) => {
      group.forEach(callback);
    });
  }

}
