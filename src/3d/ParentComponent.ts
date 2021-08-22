import {Component} from '../core/components';
import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

// TODO: Change this to accept EntityHandle
export class ParentComponent
  implements Component<Entity | null, Entity | null> {

  index: number | null = null;
  childrenMap: Map<number | null, Entity[]> = new Map();

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
    const prev = entity._getRawMap<Entity | null>(this, null);
    this._validateHash(
      entity,
      prev,
      value,
    );
    this._removeChildren(prev?.handle.id ?? null, entity);
    entity._setRawMap(this, value);
    // TODO: Entity without parent won't be populated in the index
    this._setChildren(value?.handle.id ?? null, entity);
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
    return value == null ? 0 : 1;
  }

  _removeChildren(id: number | null, entity: Entity) {
    const entityList = this.childrenMap.get(id);
    if (entityList != null) {
      // TODO It could be faster..
      this.childrenMap.set(id, entityList.filter((v) => v !== entity));
    }
  }

  _setChildren(id: number | null, entity: Entity) {
    let entityList = this.childrenMap.get(id);
    if (entityList == null) {
      entityList = [];
      this.childrenMap.set(id, entityList);
    }
    entityList.push(entity);
  }

  getChildren(parent: Entity | null): Entity[] {
    const id = parent?.handle.id ?? null;
    const entityList = this.childrenMap.get(id);
    return entityList ?? [];
  }

  forEachChildren(
    parent: Entity | null,
    callback: (entity: Entity) => void,
  ): void {
    this.getChildren(parent).forEach(callback);
  }

}
