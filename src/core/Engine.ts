import {EntityStore} from './EntityStore';

export const BEFORE_UPDATE_PHASE = 0;
export const UPDATE_PHASE = 1;
export const AFTER_UPDATE_PHASE = 2;
export const RENDER_PHASE = 3;
export const AFTER_RENDER_PHASE = 4;

export interface SystemFunction {
  (deltaTime: number): void;
}

export class Engine {
  entityStore: EntityStore;
  systems: Set<SystemFunction>[];
  resources: Map<string, any>;
  models: Map<string, any>;

  constructor() {
    this.entityStore = new EntityStore();
    this.systems = [];
    this.resources = new Map();
    this.models = new Map();

    const sorter = () => this.entityStore.sort();
    this.registerSystem(AFTER_UPDATE_PHASE, sorter);

    const emitter = () => this.entityStore.emitSignal();
    this.registerSystem(AFTER_UPDATE_PHASE, emitter);
  }

  registerSystem(phase: number, callback: SystemFunction): void {
    if (this.systems[phase] == null) {
      this.systems[phase] = new Set();
    }
    this.systems[phase].add(callback);
  }

  unregisterSystem(phase: number, callback: SystemFunction): void {
    if (this.systems[phase] == null) {
      return;
    }
    this.systems[phase].delete(callback);
  }

  registerModel(name: string, value: any): void {
    this.models.set(name, value);
  }

  getModel<T>(name: string): T {
    return this.models.get(name) as T;
  }

  setResource(name: string, value: any): void {
    this.resources.set(name, value);
  }

  getResource<T>(name: string): T {
    return this.resources.get(name) as T;
  }

  update(deltaTime: number): void {
    this.systems.forEach((set) => {
      set.forEach((callback) => callback(deltaTime));
    });
  }
}
