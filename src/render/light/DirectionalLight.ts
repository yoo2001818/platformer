import {vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';
import {DIRECTIONAL_LIGHT} from '../shader/light';

import {Light, LightShaderBlock} from './Light';

export interface DirectionalLightOptions {
  color: string | number[];
  power: number;
}

export class DirectionalLight implements Light<DirectionalLightOptions> {
  type = 'directional';
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
        #define NUM_POINT_LIGHTS ${numLights}

        ${DIRECTIONAL_LIGHT}
        
        uniform DirectionalLight uDirectionalLights[NUM_POINT_LIGHTS];
      `,
      body: /* glsl */`
        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          DirectionalLight light = uDirectionalLights[i];

          vec3 L;
          vec3 V = normalize(viewPos - mInfo.position);
          vec3 N = mInfo.normal;
          result +=
            calcDirectional(L, V, N, mInfo.position, light) *
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

  toJSON(): unknown {
    return this.options;
  }

  clone(): DirectionalLight {
    return new DirectionalLight(this.options);
  }
}
