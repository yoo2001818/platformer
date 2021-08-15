import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {Renderer} from '../Renderer';
import {POINT_LIGHT} from '../shader/light';

export interface LightOptions {
  color: string;
  power: number;
  attenuation: number;
}

export class Light {
  options: LightOptions;

  constructor(options: LightOptions) {
    this.options = options;
  }

  // TODO: This is only meant for point lights; it needs to be extended
  getShaderBlock(numLights: number): string {
    return /* glsl */`
      #define NUM_POINT_LIGHTS ${numLights}

      ${POINT_LIGHT}
      
      uniform PointLight uPointLights[NUM_POINT_LIGHTS];

      vec3 light(vec3 viewPos, MaterialInfo mInfo) {
        vec3 result = vec3(0.0);

        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          PointLight light = uPointLights[i];

          result += calcPoint(viewPos, mInfo, light);
        }

        return result;
      }
    `;
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    const output: unknown[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<Light>('light')!;
      if (transform == null || light == null) {
        return;
      }
      output.push({
        position: transform.getPosition(),
        color: light.options.color,
        intensity: [
          light.options.power,
          light.options.attenuation,
        ],
      });
    });
    return {uPointLights: output};
  }

  prepare(renderer: Renderer): void {
    // noop
  }
}
