import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';
import {MeshComponent} from './MeshComponent';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  camera: Entity | null;
  resources: Map<number, unknown>;
  frameId: number;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
    this.camera = null;
    this.resources = new Map();
    this.frameId = 0;
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
    this.frameId += 1;
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    entityStore.forEachChunkWith([meshComp], (chunk) => {
      const mesh = meshComp.getChunk(chunk, 0);
      if (mesh != null) {
        mesh.geometries.forEach((geometry, index) => {
          const materialIndex = Math.min(mesh.materials.length - 1, index);
          const material = mesh.materials[materialIndex];
          if (material == null) {
            throw new Error('Geometry is null');
          }
          const glGeometry = geometry.getGLGeometry(this);
          material.render(chunk, glGeometry, this);
        });
      }
    });
  }
}
