import {Camera} from '../../../3d/Camera';
import {Transform} from '../../../3d/Transform';
import {box} from '../../../geom/box';
import {GizmoEffect} from '../../../render/effect/GizmoEffect';
import {GLGeometry} from '../../../render/gl/GLGeometry';
import {GLShader} from '../../../render/gl/GLShader';
import {Renderer} from '../../../render/Renderer';
import {selectedEntity} from '../../states/selection';

const ARROW_MODEL = new GLGeometry(box());
const ARROW_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    
    void main() {
      // Determine the w value at the mid point
      vec4 midPos = uProjection * uView * uModel * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position = uProjection * uView * uModel * vec4(aPosition * 0.01 * midPos.w, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
);

export class GizmoPosRotScaleEffect implements GizmoEffect {
  renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  render(): void {
    const {renderer} = this;
    const {glRenderer, entityStore} = renderer;
    const entityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(entityHandle);
    if (entity == null) {
      return;
    }
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    glRenderer.draw({
      geometry: ARROW_MODEL,
      shader: ARROW_SHADER,
      uniforms: {
        uModel: transform.getMatrixWorld(),
        uView: cameraData.getView(camera),
        uProjection: cameraData.getProjection(renderer.getAspectRatio()),
      },
      state: {
        depth: false,
      },
    });
  }
}
