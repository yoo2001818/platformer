import {vec3} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {quad} from '../../geom/quad';
import {uvSphere} from '../../geom/uvSphere';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {convertFloatArray} from '../gl/uniform/utils';
import {DeferredPipeline} from '../pipeline/DeferredPipeline';
import {Renderer} from '../Renderer';
import {POINT_LIGHT} from '../shader/light';

import {POINT_LIGHT_VALUE} from './constant';
import {GIZMO_CIRCLE_MODEL, GIZMO_CIRCLE_SHADER, GIZMO_QUAD_MODEL, GIZMO_QUAD_SHADER, POINT_LIGHT_TEX} from './gizmo';
import {Light, LightPipelineShaderBlock, LightShaderBlock} from './Light';

export interface PointLightOptions {
  color: string | number[];
  power: number;
  radius: number;
  range: number;
}

const SPHERE_GEOM = new GLGeometry(uvSphere(10, 10));
const QUAD_GEOM = new GLGeometry(quad());
const SPHERE_VERT = /* glsl */`
  #version 100
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aInstancedPos;
  attribute vec3 aColor;
  attribute vec3 aIntensity;

  uniform mat4 uView;
  uniform mat4 uProjection;

  varying vec2 vPosition;
  varying vec3 vInstancedPos;
  varying vec3 vColor;
  varying vec3 vIntensity;

  void main() {
    vec4 pos = vec4(aPosition * aIntensity.z * 1.1 + aInstancedPos, 1.0);
    gl_Position = uProjection * uView * pos;
    vPosition = gl_Position.xy;
    vInstancedPos = aInstancedPos;
    vColor = aColor;
    vIntensity = aIntensity;
  } 
`;
const QUAD_VERT = /* glsl */`
  #version 100
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aInstancedPos;
  attribute vec3 aColor;
  attribute vec3 aIntensity;

  varying vec2 vPosition;
  varying vec3 vInstancedPos;
  varying vec3 vColor;
  varying vec3 vIntensity;

  void main() {
    vPosition = aPosition.xy;
    gl_Position = vec4(aPosition.xy, 1.0, 1.0);
    vInstancedPos = aInstancedPos;
    vColor = aColor;
    vIntensity = aIntensity;
  }
`;
const LIGHT_BLOCK: LightPipelineShaderBlock = {
  vert: '',
  noperspective: true,
  header: /* glsl */`
    ${POINT_LIGHT}

    varying vec3 vInstancedPos;
    varying vec3 vColor;
    varying vec3 vIntensity;
  `,
  body: /* glsl */`
    PointLight light;
    light.position = vInstancedPos;
    light.color = vColor;
    light.intensity = vIntensity;

    vec3 L;
    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;
    result +=
      calcPointLight(L, V, N, mInfo.position, light) *
      calcBRDF(L, V, N, mInfo);
  `,
};

export class PointLight implements Light<PointLightOptions> {
  type = 'point';
  canRaytrace = true;
  options: PointLightOptions;
  buffer: GLArrayBuffer;

  constructor(options?: PointLightOptions) {
    this.options = options ?? {
      color: '#ffffff',
      power: 1,
      radius: 0.01,
      range: 10,
    };
    this.buffer = new GLArrayBuffer(undefined, 'stream');
  }

  getOptions(): PointLightOptions {
    return this.options;
  }

  setOptions(options: PointLightOptions): void {
    this.options = options;
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_POINT_LIGHTS ${numLights}

        ${POINT_LIGHT}
        
        uniform PointLight uPointLights[NUM_POINT_LIGHTS];
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          PointLight light = uPointLights[i];

          vec3 L;
          vec3 V = normalize(viewPos - mInfo.position);
          vec3 N = mInfo.normal;
          result +=
            calcPointLight(L, V, N, mInfo.position, light) *
            calcBRDF(L, V, N, mInfo);
        }
      `,
    };
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    const output: unknown[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<PointLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      output.push({
        position: transform.getPosition(),
        color: light.options.color,
        intensity: [
          light.options.power / Math.PI,
          light.options.radius,
          light.options.range,
        ],
      });
    });
    return {uPointLights: output};
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    // noop
  }

  renderDeferred(
    entities: Entity[],
    renderer: Renderer,
    pipeline: DeferredPipeline,
  ): void {
    const {glRenderer} = renderer;
    const sphereShader = pipeline.getLightShader('point', () => ({
      ...LIGHT_BLOCK,
      vert: SPHERE_VERT,
    }));
    const quadShader = pipeline.getLightShader('point-full', () => ({
      ...LIGHT_BLOCK,
      vert: QUAD_VERT,
    }));
    // Split sphere / quad shader; this is done by comparing against the camera
    const {camera} = renderer;
    const cameraPos = camera!.get<Transform>('transform')!.getPosition();
    const cameraNear = camera!.get<Camera>('camera')!.options.near;
    const sphereEntities: Entity[] = [];
    const quadEntities: Entity[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<PointLight>('light')!;
      const {options} = light;
      const pos = transform.getPosition();
      const range = options.range * 1.2;
      const distance = vec3.dist(cameraPos, pos);
      if (distance > range + cameraNear) {
        sphereEntities.push(entity);
      } else {
        quadEntities.push(entity);
      }
    });
    // Prepare buffer.
    const bufferData = new Float32Array(entities.length * 9);
    let i = 0;
    const fillEntity = (entity: Entity): void => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<PointLight>('light')!;
      const {options} = light;
      const pos = transform.getPosition();
      const range = options.range * 1.05;
      bufferData[i * 9] = pos[0];
      bufferData[i * 9 + 1] = pos[1];
      bufferData[i * 9 + 2] = pos[2];
      const colorData = convertFloatArray(options.color, 3);
      bufferData[i * 9 + 3] = colorData[0];
      bufferData[i * 9 + 4] = colorData[1];
      bufferData[i * 9 + 5] = colorData[2];
      bufferData[i * 9 + 6] = options.power / Math.PI;
      bufferData[i * 9 + 7] = options.radius;
      bufferData[i * 9 + 8] = range;
      i += 1;
    };
    sphereEntities.forEach(fillEntity);
    quadEntities.forEach(fillEntity);
    // Upload buffer
    this.buffer.set(bufferData);
    this.buffer.bind(glRenderer);
    // Draw sphere entities first.
    if (sphereEntities.length > 0) {
      sphereShader.bind(glRenderer);
      sphereShader.setAttribute('aInstancedPos', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: 0,
        divisor: 1,
      });
      sphereShader.setAttribute('aColor', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: 3 * 4,
        divisor: 1,
      });
      sphereShader.setAttribute('aIntensity', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: 6 * 4,
        divisor: 1,
      });
      pipeline.drawLight({
        geometry: SPHERE_GEOM,
        shader: sphereShader,
        uniforms: {},
        state: {
          depthMask: false,
        },
        primCount: sphereEntities.length,
      });
    }
    // Then the quad entities.
    if (quadEntities.length > 0) {
      quadShader.bind(glRenderer);
      const quadOffset = 9 * 4 * sphereEntities.length;
      quadShader.setAttribute('aInstancedPos', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: quadOffset,
        divisor: 1,
      });
      quadShader.setAttribute('aColor', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: quadOffset + 3 * 4,
        divisor: 1,
      });
      quadShader.setAttribute('aIntensity', {
        buffer: this.buffer,
        stride: 9 * 4,
        offset: quadOffset + 6 * 4,
        divisor: 1,
      });
      pipeline.drawLight({
        geometry: QUAD_GEOM,
        shader: quadShader,
        uniforms: {},
        state: {
          depth: 'greater',
          depthMask: false,
        },
        primCount: quadEntities.length,
      });
    }
  }

  writeTexture(entity: Entity, buffer: Float32Array, position: number): void {
    // (pos, type), (color), (power, radius, range)
    const {options} = this;
    const transform = entity.get<Transform>('transform')!;
    if (transform == null) {
      return;
    }
    const pos = transform.getPositionWorld();
    buffer[position + 0] = pos[0];
    buffer[position + 1] = pos[1];
    buffer[position + 2] = pos[2];
    buffer[position + 3] = POINT_LIGHT_VALUE;
    const colorVec = convertFloatArray(options.color, 3);
    buffer[position + 4] = colorVec[0];
    buffer[position + 5] = colorVec[1];
    buffer[position + 6] = colorVec[2];
    buffer[position + 8] = options.power / Math.PI;
    buffer[position + 9] = options.radius;
    buffer[position + 10] = options.range;
  }

  renderGizmo(entities: Entity[], renderer: Renderer, color: string): void {
    const {glRenderer, pipeline} = renderer!;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    entities.forEach((entity) => {
      const camUniforms = pipeline.getCameraUniforms();

      const transform = entity.get<Transform>('transform');
      const light = entity.get<Light>('light');
      if (transform == null || light == null) {
        return;
      }
      if (!(light instanceof PointLight)) {
        return;
      }
      const radius = light.getOptions().radius;

      glRenderer.draw({
        geometry: GIZMO_QUAD_MODEL,
        shader: GIZMO_QUAD_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uTexture: POINT_LIGHT_TEX,
          uScale: [32 / width, 32 / height],
          uColor: color,
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

      glRenderer.draw({
        geometry: GIZMO_CIRCLE_MODEL,
        shader: GIZMO_CIRCLE_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uScale: radius,
          uColor: color,
        },
        state: {
          depth: false,
        },
      });
    });
  }

  toJSON(): unknown {
    return this.options;
  }

  clone(): PointLight {
    return new PointLight(this.options);
  }
}
