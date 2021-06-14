import {Component} from './components/Component';
import {Entity} from './Entity';
import {EntityGroup} from './EntityGroup';
import {EntityHandle} from './EntityHandle';

export class EntityStore {
  components: Component<any>[];
  componentNames: Map<string, Component<any>>;

  entities: Entity[];
  deletedEntities: Entity[];
  floatingEntities: Entity[];

  groups: Map<number, EntityGroup>;

  constructor() {
    this.components = [];
    this.componentNames = new Map();

    this.entities = [];
    this.deletedEntities = [];
    this.floatingEntities = [];

    this.groups = new Map();
  }

  registerComponent(name: string, component: Component<any>): void {
    const nextId = this.components.length;
    if (this.componentNames.has(name)) {
      throw new Error(`The component name ${name} is already taken`);
    }
    this.components.push(component);
    this.componentNames.set(name, component);
    component.register(this, nextId);
  }

  registerComponents(components: {[key: string]: Component<any>;}): void {
    Object.keys(components).forEach((name) => {
      const component = components[name];
      this.registerComponent(name, component);
    });
  }

  getComponent<T extends Component<any, any>>(name: string): T {
    return this.componentNames.get(name) as T;
  }

  getComponents(): Component<any, any>[] {
    return this.components;
  }

  create(): Entity {
    // Check if there is any deleted entities
    if (this.deletedEntities.length > 0) {
      const entity = this.deletedEntities.pop();
      entity._markUndeleted();
      return entity;
    }
    // Otherwise, create one
    const entity = new Entity(this, this.entities.length);
    this.entities.push(entity);
    entity._markFloating();
    return entity;
  }

  get(handle: EntityHandle): Entity | null {
    if (this.entities.length <= handle.id) {
      return null;
    }
    const entity = this.entities[handle.id];
    if (entity == null) {
      return null;
    }
    if (!entity.isValid() || !entity.handle.isValid(handle)) {
      return null;
    }
    return entity;
  }

  delete(handle: EntityHandle): void {
    const entity = this.get(handle);
    if (entity == null) {
      return;
    }
    entity.destroy();
  }

  _handleDestroy(entity: Entity): void {
    this.deletedEntities.push(entity);
    entity._markDeleted();
  }

  _handleFloat(entity: Entity): void {
    this.floatingEntities.push(entity);
  }

  sort(): void {

  }

  forEach(callback: (entity: Entity) => void): void {
    this.entities.forEach((entity) => {
      if (entity.isValid()) {
        callback(entity);
      }
    });
  }

  forEachWith<TValues extends any[]>(
    components: {[K in keyof TValues]: Component<TValues[K]>},
    callback: (entity: Entity, ...values: TValues) => void,
  ): void {
    this.entities.forEach((entity) => {
      const args = components.map((component) => component.get(entity));
      if (!args.every((arg) => arg != null)) {
        return;
      }
      callback(entity, ...args as TValues);
    });
  }
}
