import {mat4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {combine} from '../../geom/combine';
import {cone} from '../../geom/cone';
import {cylinder} from '../../geom/cylinder';
import {transform} from '../../geom/transform';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {GLGeometry} from '../../render/gl/GLGeometry';
import {GLShader} from '../../render/gl/GLShader';
import {Renderer} from '../../render/Renderer';

const arrow = combine([
  transform(cone(12), {
    aPosition: [
      0, 0, 1 / 12, 0,
      1 / 8, 0, 0, 0,
      0, 1 / 12, 0, 0,
      7 / 8, 0, 0, 1,
    ],
  }),
  transform(cylinder(6), {
    aPosition: [
      0, 0, 1 / 64, 0,
      7 / 16, 0, 0, 0,
      0, 1 / 64, 0, 0,
      7 / 16, 0, 0, 1,
    ],
  }),
]);

const ARROW_MODEL = new GLGeometry(combine([
  transform(arrow, {aColor: [1, 0.2, 0.2]}),
  transform(arrow, {
    aColor: [0.2, 1, 0.2],
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    ],
  }),
  transform(arrow, {
    aColor: [0.2, 0.2, 1],
    aPosition: [
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ],
  }),
]));

const ARROW_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;
    attribute vec3 aColor;

    varying vec3 vColor;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform float uScale;
    
    void main() {
      vColor = aColor;
      // Determine the w value at the mid point
      vec4 midPos = uProjection * uView * uModel * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position = uProjection * uView * uModel * vec4(aPosition * uScale * midPos.w, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec3 vColor;

    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,
);

export interface GizmoPosRotScaleEffectProps {
  entity: Entity | null;
}

export class GizmoPosRotScaleEffect
implements GizmoEffect<GizmoPosRotScaleEffectProps> {
  renderer: Renderer | null = null;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  render(props: GizmoPosRotScaleEffectProps): void {
    const {renderer} = this;
    const {glRenderer} = renderer!;
    const {entity} = props;
    if (entity == null) {
      return;
    }
    const camera = renderer!.camera!;
    const cameraData = camera.get<Camera>('camera')!;

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    const modelMat = mat4.create();
    mat4.translate(modelMat, modelMat, transform.getPositionWorld());

    glRenderer.draw({
      geometry: ARROW_MODEL,
      shader: ARROW_SHADER,
      uniforms: {
        uModel: modelMat,
        uView: cameraData.getView(camera),
        uProjection: cameraData.getProjection(renderer!.getAspectRatio()),
        uScale: 0.08,
      },
      state: {
        depth: false,
      },
    });
  }
}
