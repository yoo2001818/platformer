import {GLRenderBuffer} from './GLRenderBuffer';
import {GLRenderer} from './GLRenderer';
import {GLTexture} from './GLTexture';
import {TEXTURE_CUBE_MAP_DIRS} from './GLTextureCube';

export type GLFrameBufferTarget =
  | GLTexture
  // NOTE: Only level 0 is allowed in WebGL 1 (OpenGL ES 2.0)
  // Therefore it is meaningless to manipulate level...
  | {target?: number; texture: GLTexture;}
  | GLRenderBuffer;

export interface GLFrameBufferOptions {
  color?: GLFrameBufferTarget | GLFrameBufferTarget[];
  depth?: GLFrameBufferTarget;
  stencil?: GLFrameBufferTarget;
  depthStencil?: GLFrameBufferTarget;
  width: number;
  height: number;
}

export const COLOR_ATTACHMENT = 0x8CE0;
export const DEPTH_ATTACHMENT = 0x8D00;
export const STENCIL_ATTACHMENT = 0x8D20;
export const DEPTH_STENCIL_ATTACHMENT = 0x821A;

export class GLFrameBuffer {
  renderer: GLRenderer | null = null;
  framebuffer: WebGLFramebuffer | null = null;
  options: GLFrameBufferOptions;

  constructor(options: GLFrameBufferOptions) {
    this.options = options;
  }

  _blitBind(renderer: GLRenderer, target: number): void {
    const {gl} = renderer;
    if (this.framebuffer == null) {
      this.renderer = renderer;
      this.framebuffer = renderer.gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this._set(this.options);
      renderer.boundFrameBuffer = this;
      gl.bindFramebuffer(target, this.framebuffer);
    }
    gl.bindFramebuffer(target, this.framebuffer);
  }

  bind(renderer: GLRenderer): void {
    if (this.framebuffer == null) {
      const {gl} = renderer;
      this.renderer = renderer;
      this.framebuffer = renderer.gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this._set(this.options);
      renderer.boundFrameBuffer = this;
    }
    if (renderer.boundFrameBuffer !== this) {
      const {options} = this;
      const {gl} = renderer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      renderer.boundFrameBuffer = this;
      gl.viewport(0, 0, options.width, options.height);
    }
  }

  unbind(): void {
    const {renderer} = this;
    if (renderer != null && renderer.boundFrameBuffer != null) {
      const {gl} = renderer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      renderer.boundFrameBuffer = null;
      renderer.setViewport();
    }
  }

  dispose(): void {
    const {renderer, framebuffer} = this;
    if (renderer != null && renderer.boundFrameBuffer === this) {
      this.unbind();
    }
    if (renderer != null && framebuffer != null) {
      const {gl} = renderer;
      gl.deleteFramebuffer(framebuffer);
      this.framebuffer = null;
      this.renderer = null;
    }
  }

  _setItem(fbTarget: number, attachment: GLFrameBufferTarget): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    const {gl} = renderer;
    if (attachment instanceof GLTexture) {
      const inst = attachment._getInstance(renderer);
      inst.bind(renderer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        fbTarget,
        inst.type,
        inst.texture,
        0,
      );
    } else if ('texture' in attachment) {
      const {target, texture} = attachment;
      const inst = texture._getInstance(renderer);
      inst.bind(renderer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        fbTarget,
        target != null ? TEXTURE_CUBE_MAP_DIRS[target] : inst.type,
        inst.texture,
        0,
      );
    } else if (attachment instanceof GLRenderBuffer) {
      attachment.bind(renderer);
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        fbTarget,
        gl.RENDERBUFFER,
        attachment.renderBuffer,
      );
    }
  }

  _set(options: GLFrameBufferOptions): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    const {gl} = renderer;
    if (Array.isArray(options.color)) {
      options.color.forEach((item, index) => {
        this._setItem(COLOR_ATTACHMENT + index, item);
      });
      if (renderer.capabilities.isWebGL2) {
        const gl2 = gl as WebGL2RenderingContext;
        gl2.drawBuffers(
          options.color.map((_, index) => COLOR_ATTACHMENT + index),
        );
      } else if (renderer.capabilities.drawBuffersExt) {
        renderer.capabilities.drawBuffersExt.drawBuffersWEBGL(
          options.color.map((_, index) => COLOR_ATTACHMENT + index),
        );
      }
    } else if (options.color != null) {
      this._setItem(COLOR_ATTACHMENT, options.color);
    }
    if (options.depth != null) {
      this._setItem(DEPTH_ATTACHMENT, options.depth);
    }
    if (options.stencil != null) {
      this._setItem(STENCIL_ATTACHMENT, options.stencil);
    }
    if (options.depthStencil != null) {
      this._setItem(DEPTH_STENCIL_ATTACHMENT, options.depthStencil);
    }
    gl.viewport(0, 0, options.width, options.height);
  }

  set(options: GLFrameBufferOptions): void {
    this.options = options;
    if (this.renderer != null && this.framebuffer != null) {
      this.bind(this.renderer);
      this._set(options);
    }
  }

}
