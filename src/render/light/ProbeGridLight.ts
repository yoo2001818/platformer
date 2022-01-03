import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLTexture2D} from '../gl/GLTexture2D';
import {Renderer} from '../Renderer';
import {PROBE_GRID_LIGHT} from '../shader/light';
import {SH} from '../shader/sh';

import {
  GIZMO_QUAD_INSTANCED_SHADER,
  GIZMO_QUAD_MODEL,
  PROBE_GRID_LIGHT_TEX,
} from './gizmo';
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
  gizmoBuffer: GLArrayBuffer;

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
    this.gizmoBuffer = new GLArrayBuffer(null, 'stream');
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
      const options = light.getOptions();
      // Draw the light array
      const size = options.size;
      const dotCount = size[0] * size[1] * size[2];
      const dotArray = new Float32Array(dotCount * 3);
      let ptr = 0;
      for (let x = 0; x < size[0]; x += 1) {
        for (let y = 0; y < size[1]; y += 1) {
          for (let z = 0; z < size[2]; z += 1) {
            dotArray[ptr] = (x + 0.5) / size[0];
            dotArray[ptr + 1] = (y + 0.5) / size[1];
            dotArray[ptr + 2] = (z + 0.5) / size[2];
            ptr += 3;
          }
        }
      }
      this.gizmoBuffer.set(dotArray);
      const shader = GIZMO_QUAD_INSTANCED_SHADER;
      shader.bind(glRenderer);
      shader.setAttribute('aInstanced', {
        buffer: this.gizmoBuffer,
        divisor: 1,
      });
      glRenderer.draw({
        primCount: dotCount,
        geometry: GIZMO_QUAD_MODEL,
        shader,
        uniforms: {
          ...camUniforms,
          uModel: transform.getMatrixWorld(),
          uTexture: PROBE_GRID_LIGHT_TEX,
          uScale: [4 / width, 4 / height],
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
