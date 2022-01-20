import {vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {quad} from '../../geom/quad';
import {getBVHTexture, getLightTexture, getMaterialInjector} from '../bvhResource';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D, GLTexture2DOptions} from '../gl/GLTexture2D';
import {Renderer} from '../Renderer';
import {CONSTANT} from '../shader/constant';
import {DIRECTIONAL_LIGHT, DIRECTIONAL_LIGHT_RAYTRACE, POINT_LIGHT, POINT_LIGHT_RAYTRACE} from '../shader/light';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {INTERSECTION, INTERSECTION_MESH, MATERIAL_INJECTOR} from '../shader/raytrace/intersect';
import {LIGHT_MAP} from '../shader/raytrace/lightMap';
import {RAYTRACE_PBR} from '../shader/raytrace/pbr';
import {RAYTRACE_STEP} from '../shader/raytrace/step';
import {SAMPLE} from '../shader/sample';
import {SH} from '../shader/sh';

import {ProbeGrid, ProbeGridOptions} from './ProbeGrid';

const LIGHT_QUAD = new GLGeometry(quad());
const NUM_SAMPLES_PER_TICK = 4;

function getRandomVector(): vec3 {
  const vec = vec3.fromValues(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  );
  vec3.normalize(vec, vec);
  return vec;
}

export class RaytracedProbeGrid implements ProbeGrid {
  options: ProbeGridOptions;
  rtTexture: GLTexture2D | null = null;
  rtFrameBuffer: GLFrameBuffer | null = null;
  giTexture: GLTexture2D | null = null;
  giFrameBuffer: GLFrameBuffer | null = null;
  randomMap: GLTexture2D | null = null;
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
        width: size[0] * NUM_SAMPLES_PER_TICK,
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
        type: 'float',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        magFilter: 'linear',
        minFilter: 'linear',
        mipmap: false,
        // X * numSHVectors
        width: size[0] * 9,
        // Z * Y
        height: size[1] * size[2],
        anistropic: 1,
      });
    }
    if (this.giFrameBuffer == null) {
      this.giFrameBuffer = new GLFrameBuffer({
        color: this.giTexture!,
      });
    }
    if (this.randomMap == null) {
      this.refreshRandomMap();
    }
    if (this.isValid) {
      return;
    }
    this.rtTexture.updateSize(size[0] * NUM_SAMPLES_PER_TICK, size[1] * size[2]);
    this.giTexture.updateSize(size[0] * 9, size[1] * size[2]);
    this.isValid = true;
  }

  refreshRandomMap(): void {
    const tileWidth = 256;
    const tileHeight = 256;
    const opts: GLTexture2DOptions = {
      magFilter: 'nearest',
      minFilter: 'nearest',
      wrapS: 'repeat',
      wrapT: 'repeat',
      format: 'rgba',
      type: 'float',
      width: tileWidth,
      height: tileHeight,
      mipmap: false,
    };
    if (this.randomMap == null) {
      this.randomMap = new GLTexture2D({
        ...opts,
        source: null,
      });
    }
    const buffer = new Float32Array(tileWidth * tileHeight * 4);
    for (let i = 0; i < tileWidth * tileHeight * 4; i += 1) {
      buffer[i] = Math.random();
    }
    this.randomMap.setOptions({
      ...opts,
      source: buffer,
    });
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

          ${CONSTANT}
          ${INTERSECTION}
          ${PBR}
          ${SAMPLE}
          ${MATERIAL_INFO}
          ${POINT_LIGHT}
          ${POINT_LIGHT_RAYTRACE}
          ${DIRECTIONAL_LIGHT}
          ${DIRECTIONAL_LIGHT_RAYTRACE}
          ${LIGHT_MAP}
          ${MATERIAL_INJECTOR}
          ${INTERSECTION_MESH}
          ${RAYTRACE_PBR}
          ${RAYTRACE_STEP}

          varying vec2 vPosition;

          uniform vec4 uSize;
          uniform vec3 uDirection[${NUM_SAMPLES_PER_TICK}];
          uniform mat4 uModel;
          uniform sampler2D uBVHMap;
          uniform vec2 uBVHMapSize;
          uniform sampler2D uAtlasMap;
          uniform sampler2D uLightMap;
          uniform vec3 uLightMapSize;
          uniform sampler2D uRandomMap;
          uniform vec2 uSeed;
          uniform vec2 uRandomMapSize;

          void main() {
            // X * N, Z * Y
            int rotationId = int(floor(vPosition.x * uSize.w));
            vec3 probePos = vec3(
              fract(vPosition.x * uSize.w),
              floor(vPosition.y * uSize.y) / uSize.y,
              fract(vPosition.y * uSize.y)
            ) * 2.0 - 1.0;
            vec3 direction = uDirection[rotationId];
            vec3 position = (uModel * vec4(probePos, 1.0)).xyz;

            randInit(uSeed + fract(vPosition.xy / uRandomMapSize), uSeed);
            RaytraceContext context;
            initRaytraceContext(
              context,
              direction,
              position
            );
            context.specDisabled = 1.0;
            MaterialInfo mInfo;

            const int NUM_SAMPLES = 4;
            for (int i = 0; i < NUM_SAMPLES; i += 1) {
              bool isIntersecting = intersectMesh(mInfo, context.origin, context.dir, uBVHMap, uAtlasMap, uBVHMapSize, 0);
              if (!isIntersecting) {
                break;
              }
              raytraceStep(context, mInfo, i, i == NUM_SAMPLES - 1, uRandomMap, uBVHMap, uAtlasMap, uBVHMapSize, 0, uLightMap, uLightMapSize);
              if (context.abort) {
                break;
              }
            }
            float threshold = 1000.0;
            if (all(lessThan(context.li, vec3(threshold)))) {
              gl_FragColor = vec4(context.li, 1.0);
            } else {
              gl_FragColor = vec4(0.0);
            }
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

          #define NUM_SAMPLES ${NUM_SAMPLES_PER_TICK}

          ${CONSTANT}
          ${SH}

          varying vec2 vPosition;

          uniform sampler2D uTexture;
          uniform vec3 uDirection[NUM_SAMPLES];

          void main() {
            // source (rt texture): X * N, Z * Y
            // target (gi texture): X * SH, Z * Y
            // There is no need to retrieve Z/Y to map the SH values, as they
            // are the same from the gi texture and the rt texture.
            int shIndex = int(floor(vPosition.x * 9.0));
            float probeX = fract(vPosition.x * 9.0);
            vec3 result = vec3(0.0);
            float resultWeight = 0.0;
            for (int i = 0; i < NUM_SAMPLES; i += 1) {
              vec2 texelPos = vec2((probeX + float(i)) / float(NUM_SAMPLES), vPosition.y);
              vec4 texel = texture2D(uTexture, texelPos);
              vec3 rotation = uDirection[i];
              vec3[9] rotationSh;
              shEvaluate(rotationSh, rotation);
              #ifdef WEBGL2
              result += rotationSh[shIndex] * texel.rgb;
              resultWeight += texel.w;
              #else
              for (int j = 0; j < 9; j += 1) {
                if (shIndex == j) {
                  result += rotationSh[j] * texel.rgb;
                  resultWeight += texel.w;
                }
              }
              #endif
            }
            result *= PI * 2.0;
            gl_FragColor = vec4(result, resultWeight);
          }
        `,
      );
    });
  }

  prepare(renderer: Renderer, transform: Transform): void {
    const {options} = this;
    const {size} = options;
    const {glRenderer} = renderer;
    this._prepareTexture(renderer);
    const bvhTexture = getBVHTexture(renderer);
    bvhTexture.update();
    const materialInjector = getMaterialInjector(renderer);
    materialInjector.updateTexture();
    const lightTexture = getLightTexture(renderer);
    lightTexture.update();
    // Select random directions
    const directions =
      Array.from({length: NUM_SAMPLES_PER_TICK}, () => getRandomVector());
    const randomPos = [Math.random(), Math.random()];
    const rtShader = this._getRaytraceShader(renderer);
    // Run raytrace
    glRenderer.draw({
      shader: rtShader,
      geometry: LIGHT_QUAD,
      uniforms: {
        uSize: [size[0], size[1], size[2], NUM_SAMPLES_PER_TICK],
        uDirection: directions,
        uModel: transform.getMatrixWorld(),
        uBVHMap: bvhTexture.bvhTexture,
        uBVHMapSize: [
          bvhTexture.bvhTexture.getWidth(),
          bvhTexture.bvhTexture.getHeight(),
        ],
        uAtlasMap: materialInjector.texture,
        uLightMap: lightTexture.lightTexture,
        uLightMapSize: [
          lightTexture.lightTexture.getWidth(),
          lightTexture.lightTexture.getHeight(),
          lightTexture.numLights,
        ],
        uSeed: randomPos,
        uRandomMap: this.randomMap,
        uRandomMapSize: [
          this.randomMap!.getWidth(),
          this.randomMap!.getHeight(),
        ],
      },
      frameBuffer: this.rtFrameBuffer!,
    });
    const outputShader = this._getOutputShader(renderer);
    // Output to gi texture
    glRenderer.draw({
      shader: outputShader,
      geometry: LIGHT_QUAD,
      uniforms: {
        uTexture: this.rtTexture!,
        uDirection: directions,
      },
      frameBuffer: this.giFrameBuffer!,
      state: {
        blend: {
          equation: 'add',
          func: ['one', 'one'],
        },
      },
    });
    this.numSamples += 1;
  }
}
