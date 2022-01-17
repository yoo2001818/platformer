import {quad} from '../../geom/quad';
import {getBVHTexture, getLightTexture} from '../bvhResource';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {Renderer} from '../Renderer';
import {CONSTANT} from '../shader/constant';
import {SH} from '../shader/sh';

import {ProbeGrid, ProbeGridOptions} from './ProbeGrid';

const LIGHT_QUAD = new GLGeometry(quad());

export class RaytracedProbeGrid implements ProbeGrid {
  options: ProbeGridOptions;
  rtTexture: GLTexture2D | null = null;
  rtFrameBuffer: GLFrameBuffer | null = null;
  giTexture: GLTexture2D | null = null;
  giFrameBuffer: GLFrameBuffer | null = null;
  isValid = false;
  numSamples = 0;

  constructor(options?: ProbeGridOptions) {
    this.options = options ?? {size: [0, 0, 0]};
    this.isValid = false;
    this.numSamples = 0;
  }

  dispose(): void {
    this.rtTexture?.dispose();
    this.rtFrameBuffer?.dispose();
    this.giTexture?.dispose();
    this.giFrameBuffer?.dispose();
  }

  setOptions(options: ProbeGridOptions): void {
    this.options = options;
    this.isValid = false;
  }

  getTexture(): GLTexture2D {
    const giTexture = this.giTexture;
    if (giTexture == null) {
      throw new Error('You must call prepare() before calling this.');
    }
    return giTexture;
  }

  _prepareTexture(renderer: Renderer): void {
    const {size} = this.options;
    if (this.rtTexture == null) {
      this.rtTexture = new GLTexture2D({
        format: 'rgba',
        type: 'halfFloat',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmap: false,
        // X * numSamplesPerTick
        width: size[0],
        // Z * Y
        height: size[1] * size[2],
      });
    }
    if (this.rtFrameBuffer == null) {
      this.rtFrameBuffer = new GLFrameBuffer({
        color: this.rtTexture!,
      });
    }
    if (this.giTexture == null) {
      this.giTexture = new GLTexture2D({
        format: 'rgba',
        type: 'halfFloat',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        magFilter: 'linear',
        minFilter: 'linear',
        mipmap: false,
        // X * numSHVectors
        width: size[0] * 9,
        // Z * Y
        height: size[1] * size[2],
      });
    }
    if (this.giFrameBuffer == null) {
      this.giFrameBuffer = new GLFrameBuffer({
        color: this.giTexture!,
      });
    }
    if (this.isValid) {
      return;
    }
    this.rtTexture.updateSize(size[0], size[1] * size[2]);
    this.giTexture.updateSize(size[0] * 9, size[1] * size[2]);
    this.isValid = true;
  }

  _getRaytraceShader(renderer: Renderer): GLShader {
    return renderer.getResource(`rtprobe~raytrace`, () => {
      return new GLShader(
        /* glsl */`
          #version 100
          precision highp float;

          attribute vec3 aPosition;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy * 0.5 + 0.5;
            gl_Position = vec4(aPosition.xy, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision highp float;
          precision highp sampler2D;

          varying vec2 vPosition;

          void main() {
            gl_FragColor = vec4(1.0);
          }
        `,
      );
    });
  }

  _getOutputShader(renderer: Renderer): GLShader {
    return renderer.getResource(`rtprobe~gi`, () => {
      return new GLShader(
        /* glsl */`
          #version 100
          precision highp float;

          attribute vec3 aPosition;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy * 0.5 + 0.5;
            gl_Position = vec4(aPosition.xy, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision highp float;
          precision highp sampler2D;

          #define NUM_SAMPLES 1

          ${CONSTANT}
          ${SH}

          varying vec2 vPosition;

          uniform sampler2D uTexture;

          void main() {
            // source (rt texture): X * N, Z * Y
            // target (gi texture): X * SH, Z * Y
            // There is no need to retrieve Z/Y to map the SH values, as they
            // are the same from the gi texture and the rt texture.
            int shIndex = int(floor(vPosition.x * 9.0));
            float probeX = fract(vPosition.x * 9.0);
            vec3 result = vec3(0.0);
            for (int i = 0; i < NUM_SAMPLES; i += 1) {
              vec2 texelPos = vec2((probeX + float(i)) / float(NUM_SAMPLES), vPosition.y);
              vec4 texel = texture2D(uTexture, texelPos);
              vec3 rotation = vec3(0.0, 0.0, 1.0);
              vec3[9] rotationSh;
              shEvaluate(rotationSh, rotation);
              #ifdef WEBGL2
              result += rotationSh[shIndex] * texel.rgb;
              #else
              for (int j = 0; j < 9; j += 1) {
                if (shIndex == j) {
                  result += rotationSh[j] * texel.rgb;
                }
              }
              #endif
            }
            gl_FragColor = vec4(result, 1.0);
          }
        `,
      );
    });
  }

  prepare(renderer: Renderer): void {
    const {glRenderer} = renderer;
    this._prepareTexture(renderer);
    const bvhTexture = getBVHTexture(renderer);
    bvhTexture.update();
    const lightTexture = getLightTexture(renderer);
    lightTexture.update();
    if (this.numSamples < 1) {
      const rtShader = this._getRaytraceShader(renderer);
      // Run raytrace
      glRenderer.draw({
        shader: rtShader,
        geometry: LIGHT_QUAD,
        uniforms: {},
        frameBuffer: this.rtFrameBuffer!,
      });
      const outputShader = this._getOutputShader(renderer);
      // Output to gi texture
      glRenderer.draw({
        shader: outputShader,
        geometry: LIGHT_QUAD,
        uniforms: {
          uTexture: this.rtTexture!,
        },
        frameBuffer: this.giFrameBuffer!,
        state: {
          blend: {
            equation: 'add',
            func: ['one', 'one'],
          },
        },
      });
    }
    this.numSamples += 1;
  }
}
