import {vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {convertFloatArray} from '../gl/uniform/utils';
import {Renderer} from '../Renderer';

import {Light, LightShaderBlock} from './Light';

export interface AmbientLightOptions {
  color: string | number[];
  power: number;
}

export class AmbientLight implements Light<AmbientLightOptions> {
  type = 'ambient';
  canRaytrace = false;
  options: AmbientLightOptions;

  constructor(options?: AmbientLightOptions) {
    this.options = options ?? {
      color: '#ffffff',
      power: 1,
    };
  }

  getOptions(): AmbientLightOptions {
    return this.options;
  }

  setOptions(options: AmbientLightOptions): void {
    this.options = options;
  }

  getShaderBlock(numLights: number): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_AMBIENT_LIGHTS ${numLights}

        uniform vec3 uAmbientColor;
      `,
      body: /* glsl */`
        result += uAmbientColor;
      `,
    };
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    const ambientColor = vec3.create();
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<AmbientLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      const color = convertFloatArray(light.options.color, 3);
      vec3.scaleAndAdd(ambientColor, ambientColor, color, light.options.power);
    });
    return {uAmbientColor: ambientColor};
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    // noop
  }

  writeTexture(entity: Entity, buffer: Float32Array, position: number): void {
  }

  toJSON(): unknown {
    return this.options;
  }

  clone(): AmbientLight {
    return new AmbientLight(this.options);
  }
}
