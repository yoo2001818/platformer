import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';
import {POINT_LIGHT} from '../shader/light';

import {Light, LightShaderBlock} from './Light';

export interface PointLightOptions {
  color: string;
  power: number;
  radius: number;
  range: number;
}

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
}
