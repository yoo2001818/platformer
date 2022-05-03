import {Atom, AtomDescriptor} from './Atom';
import {Component} from './components/Component';
import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';
import {EntityGroup} from './EntityGroup';
import {EntityHandle} from './EntityHandle';
import {EntityQuery} from './EntityQuery';
import {Signal} from './Signal';
import {SignalWithArg} from './SignalWithArg';
import {sortEntity} from './sortEntity';
import {getHashCode} from './utils/getHashCode';

export class EntityStore {
  components: Component<any>[];
  componentNames: Map<string, Component<any>>;

  entities: Entity[];
  deletedEntities: Entity[];
  floatingEntities: Entity[];

  groups: Map<number, EntityGroup[]>;

  atoms: Map<string, Atom<any>>;

  version: number;
  prevVersion: number;

  structureVersion: number;
  componentVersions: number[];

  signal: Signal;
  groupAddedSignal: SignalWithArg<[EntityGroup]>;

  _resolveEntity: ((entity: Entity) => Entity) | null;

  constructor() {
    this.components = [];
    this.componentNames = new Map();

    this.entities = [];
    this.deletedEntities = [];
    this.floatingEntities = [];

    this.groups = new Map();

    this.atoms = new Map();

    this.version = 1;
    this.prevVersion = 1;
    this.structureVersion = 0;
    this.componentVersions = [];

    this.signal = new Signal();
    this.groupAddedSignal = new SignalWithArg();

    this._resolveEntity = null;
  }

  resolveEntity(entity: Entity | null): Entity | null {
    if (entity == null) {
      return null;
    }
    // If the entity belongs to this store, return it
    if (entity.store === this) {
      return entity;
    }
    if (this._resolveEntity == null) {
      return null;
    }
    return this._resolveEntity(entity);
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
      if (options != null) {
        entity.setMap(options);
      }
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
    const result = entities.map((options) => {
      const entity = this.create();
      createdEntities.push(entity);
      return entity;
    });
    entities.forEach((options, index) => {
      const entity = result[index];
      entity.setMap(options);
    });
    return result;
  }

  append(entities: Entity[]): void {
    // Copy entities from other EntityStore and append it;
    const createdEntities: Entity[] = [];
    this._resolveEntity = (entity) => {
      const index = entities.findIndex((v) => v === entity);
      return createdEntities[index];
    };
    const result = entities.map((entity) => {
      const newEntity = this.create();
      createdEntities.push(newEntity);
      return newEntity;
    });
    entities.forEach((entity, index) => {
      const newEntity = result[index];
      newEntity.setMap(entity.getCloneMap());
    });
    this._resolveEntity = null;
  }

  get(handle: EntityHandle | null): Entity | null {
    if (handle == null) {
      return null;
    }
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

  getById(id: number): Entity | null {
    const entity = this.entities[id];
    if (entity == null) {
      return null;
    }
    if (!entity.isValid()) {
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

  deleteAll(): void {
    this.getEntities().forEach((entity) => this.delete(entity.handle));
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
      this.groupAddedSignal.emit(newGroup);
      matchedGroups.push(newGroup);
    }
    const newGroup = new EntityGroup(this, hashCodes, entity);
    this.groupAddedSignal.emit(newGroup);
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

  getAtom<T>(descriptor: AtomDescriptor<T>): Atom<T> {
    let atom = this.atoms.get(descriptor.name);
    if (atom == null) {
      atom = new Atom(descriptor, this);
      this.atoms.set(descriptor.name, atom);
    }
    return atom;
  }

  nextVersion(): number {
    this.version += 1;
    return this.version;
  }

  emitSignal(): void {
    if (this.prevVersion !== this.version) {
      this.signal.emit();
      this.prevVersion = this.version;
    }
  }

  _propagateUpdates(offset: number, version: number, index: number): void {
    this.componentVersions[index] = version;
  }

  _propagateStructureUpdates(offset: number, version: number): void {
    this.structureVersion = version;
  }
}
