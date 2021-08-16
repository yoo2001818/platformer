import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {uvSphere} from '../../geom/uvSphere';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
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

  constructor(options: PointLightOptions) {
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
    const vert = /* glsl */`
      #version 100
      precision highp float;

      attribute vec3 aPosition;

      uniform mat4 uView;
      uniform mat4 uProjection;
      uniform mat4 uModel;

      varying vec2 vPosition;

      void main() {
        vec4 pos = uModel * vec4(aPosition, 1.0);
        gl_Position = uProjection * uView * pos;
        vPosition = gl_Position.xy;
      } 
    `;
    const stencilShader = renderer.getResource('point~stencil', () => {
      return new GLShader(
        vert,
        /* glsl */`
          #version 100
          precision highp float;

          void main() {
          }
        `,
      );
    });
    const shader = pipeline.getLightShader('point', () => ({
      vert,
      noperspective: true,
      ...this.getShaderBlock(1),
    }));
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<PointLight>('light')!;
      const {options} = light;
      const pos = transform.getPosition();
      const range = options.range * 1.05;
      const uniforms = {
        uModel: [
          range, 0, 0, 0,
          0, range, 0, 0,
          0, 0, range, 0,
          pos[0], pos[1], pos[2], 1,
        ],
        ...this.getUniforms([entity]),
      };
      pipeline.drawForward({
        geometry: LIGHT_GEOM,
        shader: stencilShader,
        uniforms,
        state: {
          colorMask: [false, false, false, false],
          depthMask: false,
          cull: false,
          stencil: {
            func: ['always', 0, 0xFFFF],
            op: [
              ['keep', 'decr', 'keep'],
              ['keep', 'incr', 'keep'],
            ],
          },
        },
      });
      pipeline.drawLight({
        geometry: LIGHT_GEOM,
        shader,
        uniforms,
        state: {
          depthMask: false,
          depth: false,
          cull: 'front',
          stencil: {
            func: ['notequal', 0, 0xFFFF],
            op: ['zero', 'zero', 'zero'],
          },
        },
      });
    });
  }
}
