import {quad} from '../geom/quad';

import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLGeometry} from './gl/GLGeometry';
import {GLRenderBuffer} from './gl/GLRenderBuffer';
import {GLShader} from './gl/GLShader';
import {GLTexture2D} from './gl/GLTexture2D';
import {PipelineShadowOptions} from './pipeline/Pipeline';
import {Renderer} from './Renderer';

const QUAD = new GLGeometry(quad());
const BLUR_SHADER = new GLShader(
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

    varying vec2 vPosition;

    uniform highp sampler2D uTexture;
    uniform vec2 uResolution;
    uniform vec2 uDirection;

    void main() {
      vec4 color = vec4(0.0);
      vec2 off1 = vec2(1.3333333333333333) * uDirection;
      color += texture2D(uTexture, vPosition) * 0.29411764705882354;
      color += texture2D(uTexture, vPosition + (off1 / uResolution)) * 0.35294117647058826;
      color += texture2D(uTexture, vPosition - (off1 / uResolution)) * 0.35294117647058826;
      gl_FragColor = color;
    }
  `,
);

export interface ShadowMapHandle {
  id: number;
  bounds: [number, number, number, number];
}

export class ShadowMapManager {
  // The shadow is baked by following:
  // 1. (A) Render mesh to renderbuffer
  // 2. (A->B) Blit renderbuffer to texture
  // 3. (B->C) Blur pass 1
  // 4. (C->final) Blur pass 2
  tempDepth1: GLRenderBuffer;
  tempBuffer1: GLRenderBuffer;
  tempTexture2: GLTexture2D;
  tempTexture3: GLTexture2D;
  tempFrame1: GLFrameBuffer;
  tempFrame2: GLFrameBuffer;
  tempFrame3: GLFrameBuffer;
  texture: GLTexture2D;
  frameBuffer: GLFrameBuffer;
  renderer: Renderer;
  width: number;
  height: number;
  id: number;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    const {glRenderer} = renderer;
    const {capabilities} = glRenderer;
    const useFloat =
      capabilities.hasFloatBuffer() &&
      capabilities.hasFloatTextureLinear();
    this.tempDepth1 = new GLRenderBuffer({
      width: 512,
      height: 512,
      format: capabilities.isWebGL2 ? 'depthComponent24' : 'depthComponent16',
      samples: capabilities.isWebGL2 ? 4 : 0,
    });
    this.tempBuffer1 = new GLRenderBuffer({
      width: 512,
      height: 512,
      format: useFloat ? 'rgba32f' : 'rgba16f',
      samples: 4,
    });
    this.tempTexture2 = new GLTexture2D({
      format: 'rgba',
      type: useFloat ? 'float' : 'halfFloat',
      width: 512,
      height: 512,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    this.tempTexture3 = new GLTexture2D({
      format: 'rgba',
      type: useFloat ? 'float' : 'halfFloat',
      width: 512,
      height: 512,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    if (capabilities.isWebGL2) {
      this.tempFrame1 = new GLFrameBuffer({
        width: 512,
        height: 512,
        depth: this.tempDepth1,
        color: this.tempBuffer1,
      });
    } else {
      this.tempFrame1 = new GLFrameBuffer({
        width: 512,
        height: 512,
        depth: this.tempDepth1,
        color: this.tempTexture2,
      });
    }
    this.tempFrame2 = new GLFrameBuffer({
      width: 512,
      height: 512,
      color: this.tempTexture2,
    });
    this.tempFrame3 = new GLFrameBuffer({
      width: 512,
      height: 512,
      color: this.tempTexture3,
    });
    this.texture = new GLTexture2D({
      format: 'rgba',
      type: useFloat ? 'float' : 'halfFloat',
      width: 2048,
      height: 2048,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    this.frameBuffer = new GLFrameBuffer({
      width: 2048,
      height: 2048,
      color: this.texture,
    });
    this.width = 2048;
    this.height = 2048;
    this.id = 0;
  }

  get(handle?: ShadowMapHandle | null): ShadowMapHandle {
    if (handle != null) {
      return handle;
    }
    // TODO Actually implement logic
    const result: ShadowMapHandle = {
      id: this.id,
      bounds: [this.id * 512, 0, 512, 512],
    };
    this.id += 1;
    return result;
  }

  release(handle: ShadowMapHandle): void {
    // TODO Actually implement logic
  }

  beginRender(handle: ShadowMapHandle): PipelineShadowOptions {
    const {glRenderer} = this.renderer;
    const {gl} = glRenderer;
    gl.clearColor(1, 1, 0, 0);
    glRenderer.clear(this.tempFrame1);
    gl.clearColor(0, 0, 0, 0);
    return {
      frameBuffer: this.tempFrame1,
    };
  }

  finalizeRender(handle: ShadowMapHandle): void {
    const {glRenderer} = this.renderer;
    const {gl, capabilities} = glRenderer;
    if (capabilities.isWebGL2) {
      // Rendered mesh -> tempTexture2
      glRenderer.blit(
        this.tempFrame1,
        this.tempFrame2,
        gl.COLOR_BUFFER_BIT,
      );
    }
    // tempTexture2 -> tempTexture3 (X)
    glRenderer.draw({
      frameBuffer: this.tempFrame3,
      geometry: QUAD,
      shader: BLUR_SHADER,
      uniforms: {
        uTexture: this.tempTexture2,
        uResolution: [
          this.tempTexture2.getWidth(),
          this.tempTexture2.getHeight(),
        ],
        uDirection: [1, 0],
      },
    });
    // tempTexture3 -> output (Y)
    glRenderer.draw({
      frameBuffer: this.frameBuffer,
      geometry: QUAD,
      shader: BLUR_SHADER,
      uniforms: {
        uTexture: this.tempTexture3,
        uResolution: [
          this.tempTexture3.getWidth(),
          this.tempTexture3.getHeight(),
        ],
        uDirection: [0, 1],
      },
      state: {
        viewport: handle.bounds,
      },
    });
  }
}
