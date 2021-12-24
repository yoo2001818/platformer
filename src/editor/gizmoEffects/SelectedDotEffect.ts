import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import { quad } from '../../geom/quad';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {GLGeometry} from '../../render/gl/GLGeometry';
import {GLShader} from '../../render/gl/GLShader';
import {Renderer} from '../../render/Renderer';

const QUAD_MODEL = new GLGeometry(quad());

const QUAD_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;
    attribute vec2 aTexCoord;

    varying vec3 vTexCoord;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    uniform vec2 uScale;
    
    void main() {
      mat4 mvp = uProjection * uView * uModel;
      // Determine the NDC of the center position
      vec4 centerPos = mvp * vec4(0.0, 0.0, 0.0, 1.0);
      centerPos /= centerPos.w;
      // Calculate in screen space...
      gl_Position = vec4(centerPos.xy + aPosition.xy * uScale, 0.0, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec3 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
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

    const item = [0, 1, 2].find((axis) => {
      const dir = vec3.create();
      dir[axis] = 1;
      return this._testIntersectAxis(mvp, dir, point);
    });

    return item ?? null;
  }

  render(props: GizmoPosRotScaleEffectProps): void {
    const {renderer} = this;
    const {glRenderer, pipeline} = renderer!;
    const {entity, highlightAxis} = props;
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
    if (highlightAxis != null) {
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
      },
    });
  }
}
