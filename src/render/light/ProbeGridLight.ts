import {vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {GLTexture2D} from '../gl/GLTexture2D';
import {Renderer} from '../Renderer';
import {PROBE_GRID_LIGHT} from '../shader/light';
import {SH} from '../shader/sh';

import {DIRECTIONAL_LIGHT_TEX, GIZMO_QUAD_MODEL, GIZMO_QUAD_SHADER} from './gizmo';
import {Light, LightShaderBlock} from './Light';

export interface ProbeGridLightOptions {
  size: number[];
  power: number;
  range: number;
}

export class ProbeGridLight implements Light<ProbeGridLightOptions> {
  type = 'probeGrid';
  canRaytrace = false;
  options: ProbeGridLightOptions;
  probeBuffer: Float32Array;
  probeTex: GLTexture2D;

  constructor(options?: ProbeGridLightOptions) {
    this.options = options ?? {
      size: [5, 5, 5],
      power: 1,
      range: 0.3,
    };
    this.probeBuffer = new Float32Array();
    this.probeTex = new GLTexture2D({
      width: 1,
      height: 1,
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmap: false,
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'halfFloat',
    });
  }

  getOptions(): ProbeGridLightOptions {
    return this.options;
  }

  setOptions(options: ProbeGridLightOptions): void {
    this.options = options;
  }

  getShaderBlock(numLights: number, renderer: Renderer): LightShaderBlock {
    return {
      header: /* glsl */`
        #define NUM_PROBE_GRID_LIGHTS ${numLights}

        ${SH}
        ${PROBE_GRID_LIGHT}

        uniform ProbeGridLight uProbeGridLights[NUM_PROBE_GRID_LIGHTS];
        uniform sampler2D uProbeGridLightMaps[NUM_PROBE_GRID_LIGHTS];
      `,
      body: Array.from({length: numLights}).map((_, i) => /* glsl */`
        result += calcProbeGridLight(
          viewPos,
          mInfo,
          uProbeGridLightMaps[${i}],
          uProbeGridLights[${i}]
        );
      `).join('\n'),

      /*
      body: glsl `
        for (int i = 0; i < NUM_PROBE_GRID_LIGHTS; i += 1) {
          result += calcProbeGridLight(
            viewPos,
            mInfo,
            uProbeGridLightMaps[i],
            uProbeGridLights[i]
          );
        }
      `,
      */
    };
  }

  getUniforms(entities: Entity[], renderer: Renderer): {[key: string]: unknown;} {
    const output: unknown[] = [];
    const outTextures: unknown[] = [];
    entities.forEach((entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<ProbeGridLight>('light')!;
      if (transform == null || light == null) {
        return;
      }
      const matrix = transform.getMatrixWorld();
      const invMatrix = transform.getMatrixInverseWorld();
      const options = light.getOptions();
      output.push({
        matrix,
        invMatrix,
        size: options.size,
        power: options.power,
        range: options.range,
      });
      outTextures.push(0);
    });
    return {
      uProbeGridLights: output,
      uProbeGridLightMaps: outTextures,
    };
  }

  prepare(entities: Entity[], renderer: Renderer): void {
    // noop. Should prepare light map here
  }

  writeTexture(entity: Entity, buffer: Float32Array, position: number): void {
    // Noop - probe grid doesn't make sense in ray tracing
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
      if (!(light instanceof ProbeGridLight)) {
        return;
      }
      // TODO change to probe grid light
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
    });
  }

  toJSON(): unknown {
    return this.options;
  }

  clone(): ProbeGridLight {
    return new ProbeGridLight(this.options);
  }
}
