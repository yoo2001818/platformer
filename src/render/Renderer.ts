import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';
import {DeferredPipeline} from './pipeline/DeferredPipeline';
import {ForwardPipeline} from './pipeline/ForwardPipeline';
import {Pipeline} from './pipeline/Pipeline';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  pipeline: Pipeline;
  camera: Entity | null;
  resources: Map<string | number, unknown>;
  frameId: number;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
    const {capabilities} = glRenderer;
    if (capabilities.hasDrawBuffers() && capabilities.hasHalfFloatBuffer()) {
      this.pipeline = new DeferredPipeline(this);
    } else {
      this.pipeline = new ForwardPipeline(this);
    }
    this.camera = null;
    this.resources = new Map();
    this.frameId = 0;
  }

  getAspectRatio(): number {
    return this.glRenderer.getAspectRatio();
  }

  getResource<T>(id: string | number, onCreate: () => T): T {
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
    const {camera, pipeline} = this;
    if (camera == null) {
      return;
    }
    this.frameId += 1;
    pipeline.render();
  }
}
