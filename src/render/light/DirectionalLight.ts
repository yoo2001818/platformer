import {vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {convertFloatArray} from '../gl/uniform/utils';
import {Renderer} from '../Renderer';
import {DIRECTIONAL_LIGHT} from '../shader/light';

import {DIRECTIONAL_LIGHT_VALUE} from './constant';
import {DIRECTIONAL_LIGHT_TEX, GIZMO_LINE_MODEL, GIZMO_LINE_SHADER, GIZMO_QUAD_MODEL, GIZMO_QUAD_SHADER} from './gizmo';
import {Light, LightShaderBlock} from './Light';

export interface DirectionalLightOptions {
  color: string | number[];
  power: number;
}

export class DirectionalLight implements Light<DirectionalLightOptions> {
  type = 'directional';
  canRaytrace = true;
  options: DirectionalLightOptions;

  constructor(options?: DirectionalLightOptions) {
    this.options = options ?? {
      color: '#ffffff',
      power: 1,
    };
  }

  getOptions(): DirectionalLightOptions {
    return this.options;
  }

  setOptions(options: DirectionalLightOptions): void {
    this.options = options;
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_DIRECTIONAL_LIGHTS ${numLights}

        ${DIRECTIONAL_LIGHT}
        
        uniform DirectionalLight uDirectionalLights[NUM_DIRECTIONAL_LIGHTS];
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_DIRECTIONAL_LIGHTS; i += 1) {
          DirectionalLight light = uDirectionalLights[i];

          vec3 L;
          vec3 V = normalize(viewPos - mInfo.position);
          vec3 N = mInfo.normal;
          result +=
            calcDirectionalLight(L, V, N, mInfo.position, light) *
            calcBRDF(L, V, N, mInfo);
        }
      `,
    };
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    const output: unknown[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<DirectionalLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      const dir = vec3.create();
      vec3.set(dir, 0, 0, 1);
      vec3.transformQuat(dir, dir, transform.getRotation());
      output.push({
        color: light.options.color,
        direction: [
          dir[0],
          dir[1],
          dir[2],
          light.options.power / Math.PI,
        ],
      });
    });
    return {uDirectionalLights: output};
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    // noop
  }

  writeTexture(entity: Entity, buffer: Float32Array, position: number): void {
    // dir, color, power
    const {options} = this;
    const transform = entity.get<Transform>('transform')!;
    if (transform == null) {
      return;
    }
    const dir = vec3.create();
    vec3.set(dir, 0, 0, 1);
    vec3.transformQuat(dir, dir, transform.getRotation());
    buffer[position + 0] = dir[0];
    buffer[position + 1] = dir[1];
    buffer[position + 2] = dir[2];
    buffer[position + 3] = DIRECTIONAL_LIGHT_VALUE;
    const colorVec = convertFloatArray(options.color, 3);
    buffer[position + 4] = colorVec[0];
    buffer[position + 5] = colorVec[1];
    buffer[position + 6] = colorVec[2];
    buffer[position + 7] = options.power;
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
      if (!(light instanceof DirectionalLight)) {
        return;
      }
      glRenderer.draw({
        geometry: GIZMO_QUAD_MODEL,
        shader: GIZMO_QUAD_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uTexture: DIRECTIONAL_LIGHT_TEX,
          uScale: [48 / width, 48 / height],
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
        geometry: GIZMO_LINE_MODEL,
        shader: GIZMO_LINE_SHADER,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uScale: 10,
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

  clone(): DirectionalLight {
    return new DirectionalLight(this.options);
  }
}
