import {Camera} from '../../../3d/Camera';
import {Transform} from '../../../3d/Transform';
import {Entity} from '../../../core/Entity';
import {GizmoEffect} from '../../../render/effect/GizmoEffect';
import {GLShader} from '../../../render/gl/GLShader';
import {Mesh} from '../../../render/Mesh';
import {Renderer} from '../../../render/Renderer';

const TEST_SHADER = new GLShader(
  /* glsl */`
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
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
);

export class SelectedEffect implements GizmoEffect {
  renderer: Renderer;
  entity: Entity | null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.entity = null;
  }

  setEntity(entity: Entity | null): void {
    this.entity = entity;
  }

  render(deltaTime?: number): void {
    const {entity, renderer} = this;
    if (entity == null) {
      return;
    }
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;

    const mesh = entity.get<Mesh>('mesh');
    const transform = entity.get<Transform>('transform');
    if (mesh == null || transform == null) {
      return;
    }
    mesh.geometries.forEach((geom) => {
      renderer.glRenderer.draw({
        geometry: geom.getGLGeometry(renderer),
        shader: TEST_SHADER,
        uniforms: {
          uModel: transform.getMatrixWorld(),
          uView: cameraData.getView(camera),
          uProjection: cameraData.getProjection(renderer.getAspectRatio()),
        },
        state: {
          depth: 'lequal',
          polygonOffset: [-1, 0],
        },
      });
    });
  }
}
