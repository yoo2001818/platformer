import {Component} from '../core/components';
import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

export class ParentComponent implements Component<Entity | null> {

  entityStore: EntityStore | null = null;
  name: string | null = null;
  index: number | null = null;
  childrenMap: Map<number | null, Entity[]> = new Map();

  getName(): string | null {
    return this.name;
  }

  getIndex(): number | null {
    return this.index;
  }

  register(store: EntityStore, index: number, name: string): void {
    this.entityStore = store;
    this.index = index;
    this.name = name;
    this.childrenMap = new Map();
  }

  unregister(): void {
    this.entityStore = null;
    this.index = null;
  }

  toJSON(entity: Entity): unknown | null {
    const target = this.get(entity);
    if (target != null) {
      return target.handle.toJSON();
    }
    return target;
  }

  get(entity: Entity): Entity | null {
    return entity._getRawMap(this, null);
  }

  set(entity: Entity, value: Entity | null): void {
    const prev = entity._getRawMap<Entity | null>(this, null);
    entity._setHashCode(this.index!, this.getHashCode(value));
    this._removeChildren(prev?.handle.id ?? null, entity);
    const nextEntity = this.entityStore?.resolveEntity(value);
    entity._setRawMap(this, nextEntity);
    this._setChildren(nextEntity?.handle.id ?? null, entity);
  }

  delete(entity: Entity): void {
    const prev = entity._getRawMap<Entity | null>(this, null);
    entity._setHashCode(this.index!, this.getHashCode(null));
    this._removeChildren(prev?.handle.id ?? null, entity);
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
