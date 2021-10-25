import {Component} from './components/Component';
import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';
import {EntityFuture} from './EntityFuture';
import {EntityGroup} from './EntityGroup';
import {EntityHandle} from './EntityHandle';
import {EntityQuery} from './EntityQuery';
import {sortEntity} from './sortEntity';
import {getHashCode} from './utils/getHashCode';

export class EntityStore {
  components: Component<any>[];
  componentNames: Map<string, Component<any>>;

  entities: Entity[];
  deletedEntities: Entity[];
  floatingEntities: Entity[];

  groups: Map<number, EntityGroup[]>;

  version: number;

  // FIXME: This should be specified differently; it is only used for
  // createEntities
  futureResolver: ((future: EntityFuture) => Entity) | null;

  constructor() {
    this.components = [];
    this.componentNames = new Map();

    this.entities = [];
    this.deletedEntities = [];
    this.floatingEntities = [];

    this.groups = new Map();

    this.version = 1;

    this.futureResolver = null;
  }

  registerComponent(name: string, component: Component<any>): void {
    const nextId = this.components.length;
    if (this.componentNames.has(name)) {
      throw new Error(`The component name ${name} is already taken`);
    }
    this.components.push(component);
    this.componentNames.set(name, component);
    component.register(this, nextId, name);
  }

  registerComponents(components: {[key: string]: Component<any>;}): void {
    Object.keys(components).forEach((name) => {
      const component = components[name];
      this.registerComponent(name, component);
    });
  }

  getComponentOptional<T extends Component<any, any>>(
    name: string | T,
  ): T | null {
    if (typeof name !== 'string') {
      return name;
    }
    return this.componentNames.get(name) as T;
  }

  getComponent<T extends Component<any, any>>(
    name: string | T,
  ): T {
    const result = this.getComponentOptional<T>(name);
    if (result == null) {
      throw new Error(`Component ${name} is not registered`);
    }
    return result;
  }

  getComponents(): Component<any, any>[] {
    return this.components;
  }

  create(options?: {[key: string]: any;}): Entity {
    // Check if there is any deleted entities
    if (this.deletedEntities.length > 0) {
      const entity = this.deletedEntities.pop()!;
      entity._markUndeleted();
      return entity;
    }
    // Otherwise, create one
    const entity = new Entity(this, this.entities.length);
    this.entities.push(entity);
    entity._markFloating();
    if (options != null) {
      entity.setMap(options);
    }
    return entity;
  }

  createEntities(entities: {[key: string]: any;}[]): Entity[] {
    const createdEntities: Entity[] = [];
    this.futureResolver = (future) => {
      return createdEntities[future.index];
    };
    const result = entities.map((options) => {
      const entity = this.create();
      createdEntities.push(entity);
      return entity;
    });
    entities.forEach((options, index) => {
      const entity = result[index];
      entity.setMap(options);
    });
    this.futureResolver = null;
    return result;
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

  getEntities(): Entity[] {
    return this.entities.filter((v) => v.isValid());
  }

  _handleDestroy(entity: Entity): void {
    this.deletedEntities.push(entity);
    entity._markDeleted();
  }

  _handleFloat(entity: Entity): void {
    this.floatingEntities.push(entity);
  }

  getGroupOf(entity: Entity): EntityGroup {
    const hashCodes = entity.getHashCodes();
    const hashCode = getHashCode(hashCodes);
    const matchedGroups = this.groups.get(hashCode);
    if (matchedGroups != null) {
      // Try to find matching group
      const group = matchedGroups.find((group) => {
        return hashCodes.every((current, i) => current === group.hashCodes[i]);
      });
      if (group != null) {
        return group;
      }
      const newGroup = new EntityGroup(this, hashCodes, entity);
      matchedGroups.push(newGroup);
    }
    const newGroup = new EntityGroup(this, hashCodes, entity);
    this.groups.set(hashCode, [newGroup]);
    return newGroup;
  }

  query(): EntityQuery {
    return new EntityQuery(this);
  }

  sort(): void {
    sortEntity(this);
  }

  forEach(callback: (entity: Entity) => void): void {
    this.entities.forEach((entity) => {
      if (entity.isValid()) {
        callback(entity);
      }
    });
  }

  forEachGroup(callback: (group: EntityGroup) => void): void {
    for (const groups of this.groups.values()) {
      for (const group of groups) {
        callback(group);
      }
    }
  }

  forEachWith(
    components: (Component<any> | string)[],
    callback: (entity: Entity) => void,
  ): void {
    const mappedComponents = components.map((component) => {
      if (typeof component === 'string') {
        return this.getComponent(component);
      }
      return component;
    });
    this.forEachGroup((group) => {
      // Check for hashCode
      const passed = mappedComponents.every(
        (component) => group.has(component),
      );
      if (!passed) {
        return;
      }
      group.forEach(callback);
    });
    this.floatingEntities.forEach((entity) => {
      if (!entity.isValid()) {
        return;
      }
      const args = mappedComponents
        .map((component) => component.get(entity));
      if (!args.every((arg) => arg != null)) {
        return;
      }
      callback(entity);
    });
  }

  forEachChunkWith(
    components: (Component<any> | string)[],
    callback: (chunk: EntityChunk) => void,
  ): void {
    const mappedComponents = components.map((component) => {
      if (typeof component === 'string') {
        return this.getComponent(component);
      }
      return component;
    });
    this.forEachGroup((group) => {
      // Check for hashCode
      const passed = mappedComponents.every(
        (component) => group.has(component),
      );
      if (!passed) {
        return;
      }
      group.forEachChunk(callback);
    });
  }

  toJSON(): unknown {
    return this.getEntities().map((v) => v.toJSON());
  }

  nextVersion(): number {
    this.version += 1;
    return this.version;
  }
}
