import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';
import {MeshComponent} from './MeshComponent';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  camera: Entity | null;
  resources: Map<number, unknown>;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
    this.camera = null;
    this.resources = new Map();
  }

  getAspectRatio(): number {
    return this.glRenderer.getAspectRatio();
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

  setCamera(camera: Entity): void {
    this.camera = camera;
  }

  render(): void {
    const {entityStore, camera} = this;
    if (camera == null) {
      return;
    }
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    entityStore.forEachChunkWith([meshComp], (chunk) => {
      const mesh = meshComp.getChunk(chunk, 0);
      if (mesh != null) {
        mesh.render(chunk, this);
      }
    });
  }
}
