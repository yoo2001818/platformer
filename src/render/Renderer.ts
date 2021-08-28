import {mat4} from 'gl-matrix';

import {Camera} from '../3d/Camera';
import {Transform} from '../3d/Transform';
import {TransformComponent} from '../3d/TransformComponent';
import {Entity} from '../core/Entity';
import {EntityStore} from '../core/EntityStore';
import {box} from '../geom/box';
import {calcNormals} from '../geom/calcNormals';

import {GLGeometry} from './gl/GLGeometry';
import {GLRenderer} from './gl/GLRenderer';
import {GLShader} from './gl/GLShader';
import {DeferredPipeline} from './pipeline/DeferredPipeline';
import {ForwardPipeline} from './pipeline/ForwardPipeline';
import {Pipeline} from './pipeline/Pipeline';
import {ShadowMapManager} from './ShadowMapManager';

const GIZMO_CUBE = new GLGeometry(calcNormals(box()));
const GIZMO_SHADER = new GLShader(
  /* glsl */`
    #version 100
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;

    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    } 
  `,
  /* glsl */`
    #version 100
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `,
);

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;
  pipeline: Pipeline;
  camera: Entity | null;
  resources: Map<string | number, unknown>;
  shadowMapManager: ShadowMapManager;
  frameId: number;
  frameVersion = -1;

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
    this.shadowMapManager = new ShadowMapManager(this);
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
    this.frameVersion = -1;
  }

  render(): void {
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
    pipeline.render();
    // this.renderGizmos();
  }

  renderGizmos(): void {
    const {entityStore, camera, glRenderer} = this;
    const cameraData = camera!.get<Camera>('camera')!;
    const aspect = this.getAspectRatio();
    // Render gizmos on the top of displayed result
    entityStore.forEachWith(['transform'], (entity) => {
      const transform = entity.get<Transform>('transform')!;
      const pos = transform.getPositionWorld();
      const mat = mat4.create();
      mat4.translate(mat, mat, pos);
      mat4.scale(mat, mat, [0.04, 0.04, 0.04]);
      glRenderer.draw({
        geometry: GIZMO_CUBE,
        shader: GIZMO_SHADER,
        uniforms: {
          uView: cameraData.getView(camera!),
          uProjection: cameraData.getProjection(aspect),
          uModel: mat,
        },
        state: {
          depth: 'always',
        },
      });
    });
  }
}
