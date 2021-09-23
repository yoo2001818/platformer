import {Component} from './components/Component';
import {Entity} from './Entity';
import {EntityGroup} from './EntityGroup';
import {EntityStore} from './EntityStore';

export class EntityQuery {
  components: Component<any>[] = [];
  withComponents: Component<any>[] = [];
  withoutComponents: Component<any>[] = [];
  entityStore: EntityStore;

  constructor(entityStore: EntityStore) {
    this.entityStore = entityStore;
  }

  reset(): void {
    this.components = [];
    this.withComponents = [];
    this.withoutComponents = [];
  }

  with(...components: (Component<any> | string)[]): this {
    for (const name of components) {
      const component = this.entityStore.getComponent(name);
      this.withComponents.push(component);
    }
    return this;
  }

  without(...components: (Component<any> | string)[]): this {
    for (const name of components) {
      const component = this.entityStore.getComponent(name);
      this.withoutComponents.push(component);
    }
    return this;
  }

  _testEntity(entity: Entity): boolean {
    if (!entity.isValid()) {
      return false;
    }
    if (!this.withComponents.every((v) => entity.has(v))) {
      return false;
    }
    if (!this.withoutComponents.every((v) => !entity.has(v))) {
      return false;
    }
    return true;
  }

  _testGroup(group: EntityGroup): boolean {
    if (!this.withComponents.every((v) => group.has(v))) {
      return false;
    }
    if (!this.withoutComponents.every((v) => !group.has(v))) {
      return false;
    }
    return true;
  }

  forEach(callback: (entity: Entity) => void): void {
    this.entityStore.forEachGroup((group) => {
      if (this._testGroup(group)) {
        group.forEach(callback);
      }
    });
    this.entityStore.floatingEntities.forEach((entity) => {
      if (this._testEntity(entity)) {
        callback(entity);
      }
    });
  }

  forEachGroup(callback: (group: EntityGroup) => void): void {
    this.entityStore.forEachGroup((group) => {
      if (this._testGroup(group)) {
        callback(group);
      }
    });
  }
}