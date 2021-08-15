import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';
import {GLFrameBuffer} from './GLFrameBuffer';
import {DrawOptions} from './types';
import {GLCapabilities} from './GLCapabilities';

export class GLRenderer {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  attributeManager: GLAttributeManager;
  textureManager: GLTextureManager;
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

  draw(options: DrawOptions): void {
    const {frameBuffer, geometry, shader, uniforms, primCount} = options;
    shader.prepareUniformTextures(this, uniforms);
    if (frameBuffer != null) {
      frameBuffer.bind(this);
    } else {
      this.unbindFrameBuffer();
    }
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
