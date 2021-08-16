import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {uvSphere} from '../../geom/uvSphere';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {convertFloatArray} from '../gl/uniform/utils';
import {DeferredPipeline} from '../pipeline/DeferredPipeline';
import {Renderer} from '../Renderer';
import {POINT_LIGHT} from '../shader/light';

import {Light, LightShaderBlock} from './Light';

export interface PointLightOptions {
  color: string;
  power: number;
  radius: number;
  range: number;
}

const LIGHT_GEOM = new GLGeometry(uvSphere(10, 10));

export class PointLight implements Light {
  type = 'point';
  options: PointLightOptions;
  buffer: GLArrayBuffer;

  constructor(options: PointLightOptions) {
    this.options = options;
    this.buffer = new GLArrayBuffer(undefined, 'stream');
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

          result += calcPoint(viewPos, mInfo, light);
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
    const vert = /* glsl */`
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
    const shader = pipeline.getLightShader('point', () => ({
      vert,
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

        result += calcPoint(viewPos, mInfo, light);
      `,
    }));
    // Prepare buffer
    const bufferData = new Float32Array(entities.length * 9);
    entities.forEach((entity, i) => {
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
    });
    // Upload buffer
    this.buffer.set(bufferData);
    this.buffer.bind(glRenderer);
    shader.bind(glRenderer);
    shader.setAttribute('aInstancedPos', {
      buffer: this.buffer,
      stride: 9 * 4,
      offset: 0,
      divisor: 1,
    });
    shader.setAttribute('aColor', {
      buffer: this.buffer,
      stride: 9 * 4,
      offset: 3 * 4,
      divisor: 1,
    });
    shader.setAttribute('aIntensity', {
      buffer: this.buffer,
      stride: 9 * 4,
      offset: 6 * 4,
      divisor: 1,
    });
    pipeline.drawLight({
      geometry: LIGHT_GEOM,
      shader,
      uniforms: {},
      state: {
        depthMask: false,
      },
      primCount: entities.length,
    });
  }
}
