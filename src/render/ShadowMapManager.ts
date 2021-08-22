import {quad} from '../geom/quad';

import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLGeometry} from './gl/GLGeometry';
import {GLRenderBuffer} from './gl/GLRenderBuffer';
import {GLShader} from './gl/GLShader';
import {GLTexture2D} from './gl/GLTexture2D';
import {PipelineShadowOptions} from './pipeline/Pipeline';
import {Renderer} from './Renderer';

const QUAD = new GLGeometry(quad());
const FINIALIZE_SHADER = new GLShader(
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

    void main() {
      gl_FragColor = texture2D(uTexture, vPosition);
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
    this.tempDepth1 = new GLRenderBuffer({
      width: 512,
      height: 512,
      format: 'depthComponent24',
      samples: 16,
    });
    this.tempBuffer1 = new GLRenderBuffer({
      width: 512,
      height: 512,
      format: 'rgba32f',
      samples: 16,
    });
    this.tempTexture2 = new GLTexture2D({
      format: 'rgba',
      type: 'float',
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
      type: 'float',
      width: 512,
      height: 512,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    this.tempFrame1 = new GLFrameBuffer({
      width: 512,
      height: 512,
      depth: this.tempDepth1,
      color: this.tempBuffer1,
    });
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
      type: 'float',
      // About 64MB
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
    return {
      frameBuffer: this.tempFrame1,
    };
  }

  finalizeRender(handle: ShadowMapHandle): void {
    const {glRenderer} = this.renderer;
    const {gl} = glRenderer;
    // Rendered mesh -> tempTexture2
    glRenderer.blit(
      this.tempFrame1,
      this.tempFrame2,
      gl.COLOR_BUFFER_BIT,
    );
    // tempTexture2 -> output
    glRenderer.draw({
      frameBuffer: this.frameBuffer,
      geometry: QUAD,
      shader: FINIALIZE_SHADER,
      uniforms: {
        uTexture: this.tempTexture2,
      },
      state: {
        viewport: handle.bounds,
      },
    });
  }
}
