import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {GLTexture} from '../gl/GLTexture';
import {getHDRType} from '../hdr/utils';
import {generateBRDFMap} from '../map/generateBRDFMap';
import {Renderer} from '../Renderer';
import {CUBE_PACK, CUBE_PACK_HEADER} from '../shader/cubepack';
import {HDR} from '../shader/hdr';
import {ENVIRONMENT_MAP} from '../shader/light';

import {Light, LightShaderBlock} from './Light';

const BRDF_MAP = generateBRDFMap();

export interface EnvironmentLightOptions {
  texture: GLTexture;
  power: number;
}

export class EnvironmentLight implements Light {
  type = 'environment';
  options: EnvironmentLightOptions;

  constructor(options: EnvironmentLightOptions) {
    this.options = options;
  }

  getShaderBlock(numLights: number, renderer: Renderer): LightShaderBlock {
    return {
      header: /* glsl */`
        ${CUBE_PACK_HEADER}
        #define HDR_INPUT_${getHDRType(renderer.glRenderer)}

        ${HDR}
        ${CUBE_PACK}
        ${ENVIRONMENT_MAP}
        
        uniform sampler2D uEnvironmentMap;
        uniform sampler2D uBRDFMap;
        uniform vec3 uEnvironmentMapSize;
      `,
      body: /* glsl */`
        result += calcEnvironmentMap(
          viewPos,
          mInfo,
          uBRDFMap,
          uEnvironmentMap,
          uEnvironmentMapSize.xy,
          uEnvironmentMapSize.z
        );
      `,
    };
  }

  getUniforms(entities: Entity[]): {[key: string]: unknown;} {
    let output: {[key: string]: unknown;} = {};
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<EnvironmentLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      const {options} = light;
      output = {
        uEnvironmentMap: options.texture,
        uBRDFMap: BRDF_MAP,
        uEnvironmentMapSize: [
          1 / options.texture.getWidth(),
          1 / options.texture.getHeight(),
          options.power,
        ],
      };
    });
    return output;
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    // noop
  }
}
