import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';
import {GLFrameBuffer} from './GLFrameBuffer';
import {DrawOptions, GLStateOptions} from './types';
import {GLCapabilities} from './GLCapabilities';
import {GLStateManager} from './GLStateManager';

export class GLRenderer {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  attributeManager: GLAttributeManager;
  textureManager: GLTextureManager;
  stateManager: GLStateManager;
  capabilities: GLCapabilities;
  boundFrameBuffer: GLFrameBuffer | null = null;
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

  setViewport(): void {
    const {gl} = this;
    const {canvas} = gl;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  clear(frameBuffer?: GLFrameBuffer | null): void {
    const {gl} = this;
    if (frameBuffer != null) {
      frameBuffer.bind(this);
    } else {
      this.unbindFrameBuffer();
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
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
}
