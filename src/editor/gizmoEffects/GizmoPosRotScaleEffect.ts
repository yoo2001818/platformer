import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {circleLine} from '../../geom/circleLine';
import {combine} from '../../geom/combine';
import {cone} from '../../geom/cone';
import {cylinder} from '../../geom/cylinder';
import {quad} from '../../geom/quad';
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

const quadPlane = transform(quad(1, 1), {
  aPosition: [
    0.1, 0, 0, 0,
    0, 0.1, 0, 0,
    0, 0, 0.1, 0,
    0.3, 0.3, 0, 1,
  ],
});

const rotateCircle = transform(circleLine(24), {
  aPosition: [
    0.25, 0, 0, 0,
    0, 0.25, 0, 0,
    0, 0, 0.25, 0,
    0, 0, 0.6, 1,
  ],
});

const ARROW_MODEL = new GLGeometry(combine([
  transform(arrow, {aColor: [1, 0, 0]}),
  transform(arrow, {
    aColor: [0, 1, 0],
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    ],
  }),
  transform(arrow, {
    aColor: [0, 0, 1],
    aPosition: [
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ],
  }),
]));

const PLANE_MODEL = new GLGeometry(combine([
  transform(quadPlane, {aColor: [0, 0, 1]}),
  transform(quadPlane, {
    aColor: [1, 0, 0],
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    ],
  }),
  transform(quadPlane, {
    aColor: [0, 1, 0],
    aPosition: [
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ],
  }),
]));

const ROTATE_MODEL = new GLGeometry(combine([
  transform(rotateCircle, {aColor: [0, 0, 1]}),
  transform(rotateCircle, {
    aColor: [1, 0, 0],
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1,
    ],
  }),
  transform(rotateCircle, {
    aColor: [0, 1, 0],
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

    varying vec4 vColor;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform mat4 uColor;
    uniform float uScale;
    
    void main() {
      vColor = uColor * vec4(aColor, 1.0);
      mat4 mvp = uProjection * uView * uModel;
      // Determine the w value at the mid point
      vec4 midPos = mvp * vec4(0.0, 0.0, 0.0, 1.0);
      gl_Position = mvp * vec4(aPosition * uScale * midPos.w, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }
  `,
);

function projectToScreen(
  mvp: mat4,
  modelPos: vec3,
  scale: number,
  output: vec4,
): void {
  vec4.set(output, 0, 0, 0, 1);
  vec4.transformMat4(output, output, mvp);
  const midPosW = output[3];
  vec3.copy(output as vec3, modelPos);
  vec3.scale(output as vec3, output as vec3, midPosW * scale);
  output[3] = 1;
  vec4.transformMat4(output, output, mvp);
  vec4.scale(output, output, 1 / output[3]);
}

function getDistanceSegmentPoint(
  start: vec2,
  end: vec2,
  point: vec2,
): number {
  const l2 = vec2.sqrDist(start, end);
  if (l2 === 0) {
    return vec2.dist(start, point);
  }
  const tmp = vec2.sub(vec2.create(), point, start);
  const dir = vec2.sub(vec2.create(), end, start);
  const t = Math.max(0, Math.min(1, vec2.dot(tmp, dir) / l2));
  vec2.scaleAndAdd(tmp, start, dir, t);
  return vec2.dist(tmp, point);
}

export interface GizmoPosRotScaleEffectProps {
  entity: Entity | null;
  highlightAxis?: number | null;
  showRotation?: boolean;
}

export class GizmoPosRotScaleEffect
implements GizmoEffect<GizmoPosRotScaleEffectProps> {
  renderer: Renderer | null = null;
  lastEntity: Entity | null = null;
  scale = 0.08;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
    this.lastEntity = null;
  }

  dispose(): void {

  }

  _testIntersectAxis(mvp: mat4, axis: vec3, point: vec2): boolean {
    const start = vec3.create();
    const startNDC = vec4.create();
    const axisNDC = vec4.create();
    projectToScreen(mvp, start, this.scale, startNDC);
    projectToScreen(mvp, axis, this.scale, axisNDC);
    const dist =
      getDistanceSegmentPoint(startNDC as vec2, axisNDC as vec2, point);
    return dist < 2 * 0.08 * this.scale;
  }

  _testIntersectPlane(mvp: mat4, axis: vec3, point: vec2): boolean {
    const widget = vec3.fromValues(0.3, 0.3, 0.3);
    for (let i = 0; i < 3; i += 1) {
      widget[i] *= 1 - axis[i];
    }
    const widgetNDC = vec4.create();
    projectToScreen(mvp, widget, this.scale, widgetNDC);
    const dist = vec2.dist(point, widgetNDC as vec2);
    return dist < 2 * 0.1 * this.scale;
  }

  testIntersect(point: vec2): number | null {
    const {renderer, lastEntity} = this;
    if (lastEntity == null) {
      return null;
    }
    const camera = renderer!.camera!;
    const cameraData = camera.get<Camera>('camera')!;
    const aspect = renderer!.getAspectRatio();

    const transform = lastEntity.get<Transform>('transform');
    if (transform == null) {
      return null;
    }

    const mvp = mat4.create();
    mat4.translate(mvp, mvp, transform.getPositionWorld());
    mat4.multiply(mvp, cameraData.getView(camera), mvp);
    mat4.multiply(mvp, cameraData.getProjection(aspect), mvp);

    for (let i = 0; i < 6; i += 1) {
      const dir = vec3.create();
      dir[i % 3] = 1;
      let result;
      if (i >= 3) {
        result = this._testIntersectPlane(mvp, dir, point);
      } else {
        result = this._testIntersectAxis(mvp, dir, point);
      }
      if (result) {
        return i;
      }
    }

    return null;
  }

  render(props: GizmoPosRotScaleEffectProps): void {
    const {renderer} = this;
    const {glRenderer, pipeline} = renderer!;
    const {entity, highlightAxis, showRotation} = props;
    this.lastEntity = entity;
    if (entity == null) {
      return;
    }
    const camUniforms = pipeline.getCameraUniforms();

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    const modelMat = mat4.create();
    mat4.translate(modelMat, modelMat, transform.getPositionWorld());

    const colorMat = mat4.create();
    mat4.translate(colorMat, colorMat, [0.2, 0.2, 0.2]);
    if (highlightAxis != null && highlightAxis < 3) {
      colorMat[highlightAxis * 4 + 0] += 0.3;
      colorMat[highlightAxis * 4 + 1] += 0.3;
      colorMat[highlightAxis * 4 + 2] += 0.3;
    }
    mat4.scale(colorMat, colorMat, [1, 0.6, 1]);

    glRenderer.draw({
      geometry: ARROW_MODEL,
      shader: ARROW_SHADER,
      uniforms: {
        ...camUniforms,
        uModel: modelMat,
        uScale: this.scale,
        uColor: colorMat,
      },
      state: {
        depth: false,
        blend: {
          equation: 'add',
          func: [
            ['srcAlpha', 'oneMinusSrcAlpha'],
            ['one', 'one'],
          ],
        },
      },
    });

    const planeColorMat = mat4.create();
    mat4.translate(planeColorMat, planeColorMat, [0.2, 0.2, 0.2]);
    if (highlightAxis != null && highlightAxis >= 3) {
      planeColorMat[(highlightAxis % 3) * 4 + 0] += 0.3;
      planeColorMat[(highlightAxis % 3) * 4 + 1] += 0.3;
      planeColorMat[(highlightAxis % 3) * 4 + 2] += 0.3;
    }
    mat4.scale(planeColorMat, planeColorMat, [1, 0.6, 1]);
    planeColorMat[15] = 0.7;

    glRenderer.draw({
      geometry: PLANE_MODEL,
      shader: ARROW_SHADER,
      uniforms: {
        ...camUniforms,
        uModel: modelMat,
        uScale: this.scale,
        uColor: planeColorMat,
      },
      state: {
        depth: false,
        cull: false,
        blend: {
          equation: 'add',
          func: [
            ['srcAlpha', 'oneMinusSrcAlpha'],
            ['one', 'one'],
          ],
        },
      },
    });

    if (showRotation) {
      glRenderer.draw({
        geometry: ROTATE_MODEL,
        shader: ARROW_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: modelMat,
          uScale: this.scale,
          uColor: planeColorMat,
        },
        state: {
          depth: false,
          cull: false,
          blend: {
            equation: 'add',
            func: [
              ['srcAlpha', 'oneMinusSrcAlpha'],
              ['one', 'one'],
            ],
          },
        },
      });
    }
  }
}
