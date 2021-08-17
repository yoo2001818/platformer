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

export class DirectionalLight implements Light {
  type = 'directional';
  options: DirectionalLightOptions;

  constructor(options: DirectionalLightOptions) {
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

          result += calcDirectional(viewPos, mInfo, light);
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
}
