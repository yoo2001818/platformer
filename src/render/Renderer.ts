import {TransformComponent} from '../3d/TransformComponent';
import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';
import {DeferredPipeline} from './pipeline/DeferredPipeline';
import {ForwardPipeline} from './pipeline/ForwardPipeline';
import {Pipeline} from './pipeline/Pipeline';
import {ShadowMapManager} from './ShadowMapManager';
import {GizmoEffect} from './effect/GizmoEffect';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  pipeline: Pipeline;
  camera: Entity | null;
  resources: Map<string | number, unknown>;
  shadowMapManager: ShadowMapManager;
  gizmoEffects: GizmoEffect[];
  frameId: number;
  frameVersion = -1;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
    const {capabilities} = glRenderer;
    if (
      capabilities.hasFragDepth() &&
      capabilities.hasDrawBuffers() &&
      capabilities.hasHalfFloatBuffer() &&
      capabilities.hasFloatBlend() &&
      capabilities.maxDrawBuffers >= 2
    ) {
      this.pipeline = new DeferredPipeline(this);
    } else {
      this.pipeline = new ForwardPipeline(this);
    }
    this.camera = null;
    this.resources = new Map();
    this.shadowMapManager = new ShadowMapManager(this);
    this.frameId = 0;
    this.gizmoEffects = [];
  }

  setPipeline(pipeline: Pipeline): void {
    this.pipeline = pipeline;
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
    this.frameVersion = -1;
  }

  render(deltaTime = 0.016): void {
    const {camera, pipeline, entityStore} = this;
    if (camera == null) {
      return;
    }
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;

    // Skip render if it's not needed
    /*
    if (transformComp.globalVersion === this.frameVersion) {
      return;
    }
    */
    this.frameId += 1;
    this.frameVersion = transformComp.globalVersion;
    pipeline.render(deltaTime);
    this.gizmoEffects.forEach((effect) => {
      effect.render();
    });
  }
}
