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

  bind(renderer: GLRenderer): void {
    if (this.framebuffer == null) {
      this.renderer = renderer;
      this.framebuffer = renderer.gl.createFramebuffer();
    }
    if (renderer.boundFrameBuffer !== this) {
      const {gl} = renderer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this._set(this.options);
    }
  }

  dispose(): void {
    const {renderer, framebuffer} = this;
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
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        fbTarget,
        attachment.type,
        attachment,
        0,
      );
    } else if ('texture' in attachment) {
      const {target, texture} = attachment;
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        fbTarget,
        target != null ? TEXTURE_CUBE_MAP_DIRS[target] : texture.type,
        texture,
        0,
      );
    } else {
      // TODO: RenderBuffer support
    }
  }

  _set(options: GLFrameBufferOptions): void {
    if (Array.isArray(options.color)) {
      options.color.forEach((item, index) => {
        this._setItem(COLOR_ATTACHMENT + index, item);
      });
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
  }

  set(options: GLFrameBufferOptions): void {
    this.options = options;
    if (this.renderer != null && this.framebuffer != null) {
      this.bind(this.renderer);
      this._set(options);
    }
  }

}
