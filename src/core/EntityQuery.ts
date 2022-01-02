import {Component} from './components/Component';
import {ComponentSignalMapper} from './ComponentSignalMapper';
import {Entity} from './Entity';
import {EntityChunk} from './EntityChunk';
import {EntityGroup} from './EntityGroup';
import {EntityStore} from './EntityStore';
import {Signal} from './Signal';
import {UpstreamSignal} from './UpstreamSignal';

export class EntityQuery {
  components: Component<any>[] = [];
  withComponents: Component<any>[] = [];
  withoutComponents: Component<any>[] = [];
  groups: EntityGroup[] = [];
  entityStore: EntityStore;
  isValid: boolean;
  signal: UpstreamSignal;
  componentSignals: ComponentSignalMapper;

  constructor(entityStore: EntityStore) {
    this.entityStore = entityStore;
    this.isValid = false;
    this._handleGroupAdded = this._handleGroupAdded.bind(this);
    this.signal = new UpstreamSignal(
      () => this.entityStore.signal,
      () => this.getVersion(),
    );
    this.componentSignals = new ComponentSignalMapper(
      this.entityStore,
      this.signal,
      (index) => this.getComponentVersion(index),
    );
  }

  _handleGroupAdded(group: EntityGroup): void {
    if (this._testGroup(group)) {
      this.groups.push(group);
    }
  }

  _updateGroups(): void {
    if (this.isValid) {
      return;
    }
    this.isValid = true;
    this.groups = [];
    this.entityStore.forEachGroup((group) => {
      if (this._testGroup(group)) {
        this.groups.push(group);
      }
    });
    this.entityStore.groupAddedSignal.add(this._handleGroupAdded);
  }

  _invalidate(): void {
    this.isValid = false;
    this.groups = [];
    this.entityStore.groupAddedSignal.remove(this._handleGroupAdded);
  }

  reset(): void {
    this.components = [];
    this.withComponents = [];
    this.withoutComponents = [];
    this._invalidate();
  }

  dispose(): void {
    this._invalidate();
  }

  with(...components: (Component<any> | string)[]): this {
    for (const name of components) {
      const component = this.entityStore.getComponent(name);
      this.withComponents.push(component);
    }
    this._invalidate();
    return this;
  }

  without(...components: (Component<any> | string)[]): this {
    for (const name of components) {
      const component = this.entityStore.getComponent(name);
      this.withoutComponents.push(component);
    }
    this._invalidate();
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
    this.forEachGroup((group) => {
      group.forEach(callback);
    });
    this.entityStore.floatingEntities.forEach((entity) => {
      if (this._testEntity(entity)) {
        callback(entity);
      }
    });
  }

  forEachGroup(callback: (group: EntityGroup) => void): void {
    this._updateGroups();
    this.groups.forEach((group) => {
      callback(group);
    });
  }

  forEachChunk(callback: (chunk: EntityChunk) => void): void {
    this.forEachGroup((group) => {
      group.forEachChunk(callback);
    });
  }

  getVersion(): number {
    let lastVersion = -1;
    this.forEachGroup((group) => {
      if (group.version > lastVersion) {
        lastVersion = group.version;
      }
    });
    return lastVersion;
  }

  getStructureVersion(): number {
    let lastVersion = -1;
    this.forEachGroup((group) => {
      if (group.structureVersion > lastVersion) {
        lastVersion = group.structureVersion;
      }
    });
    return lastVersion;
  }

  getComponentVersion(index: number): number {
    let lastVersion = -1;
    this.forEachGroup((group) => {
      if (group.componentVersions[index] > lastVersion) {
        lastVersion = group.componentVersions[index];
      }
    });
    return lastVersion;
  }

  getTopicVersion(...components: (Component<any> | string)[]): number {
    let lastVersion = this.getStructureVersion();
    for (const name of components) {
      const component = this.entityStore.getComponent(name);
      const compVersion = this.getComponentVersion(component.getIndex()!);
      if (compVersion > lastVersion) {
        lastVersion = compVersion;
      }
    }
    return lastVersion;
  }

  getComponentSignal(component: Component<any, any> | string | number): Signal {
    return this.componentSignals.get(component);
  }
}
