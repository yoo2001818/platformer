import {vec3} from 'gl-matrix';

import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {DeferredPipeline} from '../pipeline/DeferredPipeline';

function createHemisphere(samples: number): GLTexture2D {
  const data = new Float32Array(samples * 3);
  for (let i = 0; i < samples; i += 1) {
    const vec = data.subarray(i * 3, i * 3 + 3);
    vec3.set(vec, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random());
    vec3.normalize(vec, vec);
    let scale = i / samples;
    scale = 0.1 + 0.9 * scale * scale;
    vec3.scale(vec, vec, Math.random() * scale);
  }
  return new GLTexture2D({
    width: samples,
    height: 1,
    format: 'rgb',
    // TODO: Probe if this is possible. However, SSAO (and deferred pipeline) is
    // not possible if float texture can't be used
    type: 'float',
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
    wrapS: 'clampToEdge',
    wrapT: 'clampToEdge',
    source: data,
  });
}

function createNoise(size: number): GLTexture2D {
  const data = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 3] = Math.random() * 2 - 1;
    data[i * 3 + 1] = Math.random() * 2 - 1;
    data[i * 3 + 2] = 0;
  }
  return new GLTexture2D({
    width: size,
    height: size,
    format: 'rgb',
    // TODO: Probe if this is possible. However, SSAO (and deferred pipeline) is
    // not possible if float texture can't be used
    type: 'float',
    magFilter: 'nearest',
    minFilter: 'nearest',
    mipmap: false,
    wrapS: 'repeat',
    wrapT: 'repeat',
    source: data,
  });
}

const LIGHT_QUAD = new GLGeometry(quad());

export class SSAO {
  pipeline: DeferredPipeline;
  hemisphereBuffer: GLTexture2D;
  noiseBuffer: GLTexture2D;
  aoBuffer: GLTexture2D | null = null;
  aoFrameBuffer: GLFrameBuffer | null = null;
  aoOutBuffer: GLTexture2D | null = null;
  aoOutFrameBuffer: GLFrameBuffer | null = null;

  constructor(pipeline: DeferredPipeline) {
    this.pipeline = pipeline;
    this.hemisphereBuffer = createHemisphere(24);
    this.noiseBuffer = createNoise(4);
  }

  prepare(): void {
    const {glRenderer} = this.pipeline.renderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    if (this.aoBuffer == null) {
      this.aoBuffer = new GLTexture2D({
        width,
        height,
        format: 'rgba',
        // TODO: Steal g buffer from the pipeline
        type: 'halfFloat',
        magFilter: 'nearest',
        minFilter: 'nearest',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        mipmap: false,
        source: null,
      });
    }
    if (this.aoFrameBuffer == null) {
      this.aoFrameBuffer = new GLFrameBuffer({
        color: this.aoBuffer!,
      });
    }
    if (this.aoOutBuffer == null) {
      this.aoOutBuffer = new GLTexture2D({
        width,
        height,
        format: 'rgba',
        // TODO: Steal g buffer from the pipeline
        type: 'halfFloat',
        magFilter: 'nearest',
        minFilter: 'nearest',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        mipmap: false,
        source: null,
      });
    }
    if (this.aoOutFrameBuffer == null) {
      this.aoOutFrameBuffer = new GLFrameBuffer({
        color: this.aoOutBuffer!,
      });
    }
  }

  getSSAOShader(): GLShader {
    return this.pipeline.renderer.getResource('ssao', () => new GLShader(
      /* glsl */`
        #version 100
        precision highp float;

        attribute vec3 aPosition;

        varying vec2 vPosition;

        void main() {
          vPosition = aPosition.xy;
          gl_Position = vec4(aPosition.xy, 1.0, 1.0);
        }
      `,
      /* glsl */`
        precision highp float;
        #define NUM_SAMPLES 24

        ${PBR}
        ${MATERIAL_INFO}

        varying vec2 vPosition;

        uniform mat4 uInverseView;
        uniform mat4 uInverseProjection;
        uniform mat4 uView;
        uniform mat4 uProjection;
        uniform vec2 uNoiseResolution;
        uniform float uRadius;
        uniform float uBias;
        uniform float uPower;
        uniform sampler2D uHemisphereMap;
        uniform sampler2D uNoiseMap;
        uniform highp sampler2D uDepthBuffer;
        // uniform sampler2D uGBuffer0;
        uniform sampler2D uGBuffer1;
        
        void main() {
          vec2 uv = vPosition * 0.5 + 0.5;
          float depth = texture2D(uDepthBuffer, uv).x;
          vec3 position =
            depthToViewPos(depth, vPosition, uInverseProjection);
          vec3 normal = texture2D(uGBuffer1, uv).xyz * 2.0 - 1.0;
          normal = normalize((uView * vec4(normal, 0.0)).xyz);

          vec3 randomVec = texture2D(uNoiseMap, uv * uNoiseResolution).xyz;

          vec3 tangent =
            normalize(randomVec - normal * dot(randomVec, normal));
          vec3 bitangent = cross(normal, tangent);
          mat3 TBN = mat3(tangent, bitangent, normal);

          float occulsion = 0.0;
          for (int i = 0; i < NUM_SAMPLES; ++i) {
            vec3 sampleData = texture2D(
              uHemisphereMap,
              vec2(float(i) / float(NUM_SAMPLES), 0.5)).xyz;
            vec3 samplePos = TBN * sampleData;
            samplePos = position + samplePos * uRadius;

            vec4 offset = vec4(samplePos, 1.0);
            offset = uProjection * offset;
            offset.xyz /= offset.w;
            vec2 ndc = offset.xy;
            offset.xyz = offset.xyz * 0.5 + 0.5;

            float sampleDepth = texture2D(uDepthBuffer, offset.xy).x;
            vec3 sampleActualPos =
              depthToViewPos(sampleDepth, ndc, uInverseProjection);
            float rangeCheck = smoothstep(
              0.0, 1.0, uRadius / abs(sampleActualPos.z - samplePos.z));
            if (sampleActualPos.z >= samplePos.z + uBias) {
              occulsion += rangeCheck;
            }
            
          }
          occulsion = 1.0 - (occulsion / float(NUM_SAMPLES));
          occulsion = pow(max(occulsion, 0.0), uPower);
          gl_FragColor = vec4(occulsion, 0.0, 0.0, 0.0);
        }
      `,
    ));
  }

  getBlurShader(): GLShader {
    return this.pipeline.renderer.getResource('ssao~blur', () => new GLShader(
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
        precision highp float;
        #define KERNEL_SIZE 4

        varying vec2 vPosition;

        uniform vec2 uResolution;
        uniform sampler2D uAOBuffer;
        
        void main() {
          vec2 texelSize = 1.0 / uResolution;
          float result = 0.0;
          vec2 hlim = vec2(float(-KERNEL_SIZE) * 0.5 + 0.5);
          for (int i = 0; i < KERNEL_SIZE; ++i) {
            for (int j = 0; j < KERNEL_SIZE; ++j) {
              vec2 offset = (hlim + vec2(float(i), float(j))) * texelSize;
              result += texture2D(uAOBuffer, vPosition + offset).r;
            }
          }
        
          result = result / float(KERNEL_SIZE * KERNEL_SIZE);
          gl_FragColor = vec4(result, 0.0, 0.0, 0.0);
        }
      `,
    ));
  }

  render(): void {
    const {renderer, cameraUniforms, depthBuffer, gBuffers} = this.pipeline;
    const {glRenderer} = renderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    glRenderer.draw({
      frameBuffer: this.aoFrameBuffer!,
      geometry: LIGHT_QUAD,
      shader: this.getSSAOShader(),
      uniforms: {
        ...cameraUniforms,
        uNoiseResolution: [
          width / 4,
          height / 4,
        ],
        uRadius: 0.2,
        uBias: 0.005,
        uPower: 1.5,
        uHemisphereMap: this.hemisphereBuffer,
        uNoiseMap: this.noiseBuffer,
        uDepthBuffer: depthBuffer,
        uGBuffer0: gBuffers![0],
        uGBuffer1: gBuffers![1],
      },
    });
    glRenderer.draw({
      frameBuffer: this.aoOutFrameBuffer!,
      geometry: LIGHT_QUAD,
      shader: this.getBlurShader(),
      uniforms: {
        uResolution: [
          width,
          height,
        ],
        uAOBuffer: this.aoBuffer,
      },
    });
  }
}
