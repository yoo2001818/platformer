import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';
import {Mesh} from './Mesh';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  resources: Map<number, unknown>;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
    this.resources = new Map();
  }

  getResource<T>(id: number, onCreate: () => T): T {
    // TODO GC
    const item = this.resources.get(id);
    if (item != null) {
      return item as T;
    }
    const newItem = onCreate();
    this.resources.set(id, newItem);
    return newItem;
  }

  render(): void {
    const {entityStore} = this;
    entityStore.forEachChunkWith(['mesh'], (chunk) => {
      // Let's just hope that it exists
      const mesh = chunk.getAt(0)!.get<Mesh>('mesh')!;
      if (mesh != null) {
        mesh.render(chunk, renderer);
      }
    });
  }
}
