import {GLShader} from '../gl/GLShader';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLRenderBuffer} from '../gl/GLRenderBuffer';
import {GLTexture2D} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {GLGeometry} from '../gl/GLGeometry';
import {quad} from '../../geom/quad';
import {PipelineShadowShaderBlock} from '../pipeline/Pipeline';
import {Renderer} from '../Renderer';
import {BAKE_VSM} from '../shader/shadow';
import {AtlasItem} from '../Atlas';

import {ShadowPipeline} from './ShadowPipeline';

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

export class VSMShadowPipeline implements ShadowPipeline {
  type = 'vsm';
  renderer: Renderer;
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
  currentAtlas: AtlasItem | null = null;
  currentUniforms: {[key: string]: unknown;} = {};

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    const {glRenderer} = renderer;
    const {capabilities} = glRenderer;
    const useFloat = false;
    // TODO: Various resolutions
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
      anistropic: 1,
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
      anistropic: 1,
    });
    if (capabilities.isWebGL2) {
      this.tempFrame1 = new GLFrameBuffer({
        depth: this.tempDepth1,
        color: this.tempBuffer1,
      });
    } else {
      this.tempFrame1 = new GLFrameBuffer({
        depth: this.tempDepth1,
        color: this.tempTexture2,
      });
    }
    this.tempFrame2 = new GLFrameBuffer({
      color: this.tempTexture2,
    });
    this.tempFrame3 = new GLFrameBuffer({
      color: this.tempTexture3,
    });
  }

  getShader(id: string, onCreate: () => PipelineShadowShaderBlock): GLShader {
    const {renderer} = this;
    return renderer.getResource(`shadow~vsm~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          #version 100
          #extension GL_OES_standard_derivatives : enable
          precision highp float;

          varying vec3 vNormal;

          ${BAKE_VSM}

          void main() {
            float intensity = gl_FragCoord.z;
            gl_FragColor = bakeVSM(intensity);
          }
        `,
      );
    });
  }

  begin(atlas: AtlasItem, uniforms: {[key: string]: unknown;}): void {
    this.currentAtlas = atlas;
    this.currentUniforms = uniforms;
    const {glRenderer} = this.renderer;
    const {gl} = glRenderer;
    gl.clearColor(1, 0, 0, 0);
    glRenderer.clear(this.tempFrame1);
    gl.clearColor(0, 0, 0, 0);
  }

  draw(options: DrawOptions): void {
    const {glRenderer} = this.renderer;
    glRenderer.draw({
      ...options,
      frameBuffer: this.tempFrame1,
      uniforms: {
        ...options.uniforms,
        ...this.currentUniforms,
      },
    });
  }

  finalize(): void {
    if (this.currentAtlas == null) {
      throw new Error('Current shadow atlas is null');
    }
    const {glRenderer, shadowMapManager} = this.renderer;
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
    const atlas = this.currentAtlas;
    glRenderer.draw({
      frameBuffer: shadowMapManager.getFrameBuffer(),
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
        viewport: [atlas.x, atlas.y, atlas.width, atlas.height],
      },
    });
    this.currentAtlas = null;
  }
}
