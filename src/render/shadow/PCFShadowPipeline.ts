import {GLShader} from '../gl/GLShader';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLRenderBuffer} from '../gl/GLRenderBuffer';
import {GLTexture2D} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {GLGeometry} from '../gl/GLGeometry';
import {quad} from '../../geom/quad';
import {MaterialVertexShaderBlock} from '../Material';
import {Renderer} from '../Renderer';
import {BAKE_PCF, PCF} from '../shader/shadow';
import {AtlasItem} from '../Atlas';
import {LightShaderBlock} from '../light/Light';

import {ShadowPipeline} from './ShadowPipeline';

const QUAD = new GLGeometry(quad());
const COPY_SHADER = new GLShader(
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

export class PCFShadowPipeline implements ShadowPipeline {
  type = 'pcf';
  renderer: Renderer;
  // The shadow is baked by following:
  // 1. (A) Render mesh to renderbuffer
  // 2. (A->B) Blit renderbuffer to texture
  tempDepth1: GLRenderBuffer;
  tempTexture1: GLTexture2D;
  tempFrame1: GLFrameBuffer;
  currentAtlas: AtlasItem | null = null;
  currentUniforms: {[key: string]: unknown;} = {};

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    const {glRenderer} = renderer;
    const {capabilities} = glRenderer;
    const useFloat = false;
    // TODO: Various resolutions
    const resolution = 1024;
    this.tempDepth1 = new GLRenderBuffer({
      width: resolution,
      height: resolution,
      format: capabilities.isWebGL2 ? 'depthComponent32f' : 'depthComponent16',
      samples: 0,
    });
    this.tempTexture1 = new GLTexture2D({
      format: capabilities.isWebGL2 ? 'red' : 'rgba',
      type: useFloat ? 'float' : 'halfFloat',
      width: resolution,
      height: resolution,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
      anistropic: 1,
    });
    this.tempFrame1 = new GLFrameBuffer({
      depth: this.tempDepth1,
      color: this.tempTexture1,
    });
  }

  getShader(id: string, onCreate: () => MaterialVertexShaderBlock): GLShader {
    const {renderer} = this;
    return renderer.getResource(`shadow~pcf~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          #version 100
          #extension GL_OES_standard_derivatives : enable
          precision highp float;

          varying vec3 vNormal;

          ${BAKE_PCF}

          void main() {
            float intensity = gl_FragCoord.z;
            gl_FragColor = bakePCF(intensity);
          }
        `,
      );
    });
  }

  getUnpackShaderBlock(): LightShaderBlock {
    return {
      header: /* glsl */`
        ${PCF}
      `,
      body: 'unpackPCF',
    };
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
    // tempTexture1 -> output (Y)
    const atlas = this.currentAtlas;
    glRenderer.draw({
      frameBuffer: shadowMapManager.getFrameBuffer(),
      geometry: QUAD,
      shader: COPY_SHADER,
      uniforms: {
        uTexture: this.tempTexture1,
        uResolution: [
          this.tempTexture1.getWidth(),
          this.tempTexture1.getHeight(),
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
