import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';
import {GLFrameBuffer} from './GLFrameBuffer';
import {GLRenderBuffer} from './GLRenderBuffer';
import {DrawOptions, GLStateOptions} from './types';
import {GLCapabilities} from './GLCapabilities';
import {GLStateManager} from './GLStateManager';
import {TEXTURE_PARAM_MAP} from './utils';

export class GLRenderer {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  attributeManager: GLAttributeManager;
  textureManager: GLTextureManager;
  stateManager: GLStateManager;
  capabilities: GLCapabilities;
  boundFrameBuffer: GLFrameBuffer | null = null;
  boundRenderBuffer: GLRenderBuffer | null = null;
  boundArrayBuffer: GLArrayBuffer | null = null;
  boundElementArrayBuffer: GLElementArrayBuffer | null = null;
  boundVertexArray: GLVertexArray | null = null;
  boundShader: GLShader | null = null;

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl;
    this.capabilities = new GLCapabilities(this);
    this.attributeManager = new GLAttributeManager(this);
    this.textureManager = new GLTextureManager(this);
    this.stateManager = new GLStateManager(this);
  }

  unbindFrameBuffer(): void {
    if (this.boundFrameBuffer != null) {
      this.boundFrameBuffer.unbind();
    }
  }

  getAspectRatio(): number {
    const canvas = this.gl.canvas;
    return canvas.width / canvas.height;
  }

  getWidth(): number {
    const canvas = this.gl.canvas;
    return canvas.width;
  }

  getHeight(): number {
    const canvas = this.gl.canvas;
    return canvas.height;
  }

  setViewport(): void {
    const {gl} = this;
    const {canvas} = gl;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  clear(frameBuffer?: GLFrameBuffer | null, bits?: number): void {
    const {gl} = this;
    if (frameBuffer != null) {
      frameBuffer.bind(this);
    } else {
      this.unbindFrameBuffer();
    }
    gl.clear(
      bits ?? gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT,
    );
  }

  setState(state?: GLStateOptions | null): void {
    this.stateManager.setState(state ?? {});
  }

  draw(options: DrawOptions): void {
    const {frameBuffer, geometry, shader, uniforms, primCount, state} = options;
    shader.prepareUniformTextures(this, uniforms);
    if (frameBuffer != null) {
      frameBuffer.bind(this);
    } else {
      this.unbindFrameBuffer();
    }
    this.setState(state);
    shader.bind(this);
    geometry.bind(this, shader);
    shader.setUniforms(uniforms);
    if (primCount != null) {
      geometry.drawInstanced(primCount);
    } else {
      geometry.draw();
    }
  }

  blit(
    readFb: GLFrameBuffer,
    drawFb: GLFrameBuffer,
    mask: number,
    filter: 'nearest' | 'linear' = 'nearest',
  ): void {
    const {gl, capabilities} = this;
    if (capabilities.isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      readFb._blitBind(this, gl2.READ_FRAMEBUFFER);
      drawFb._blitBind(this, gl2.DRAW_FRAMEBUFFER);
      gl2.blitFramebuffer(
        0, 0, readFb.options.width, readFb.options.height,
        0, 0, drawFb.options.width, drawFb.options.height,
        mask,
        TEXTURE_PARAM_MAP[filter],
      );
    } else {
      throw new Error('Not implemented yet');
    }
  }
}
