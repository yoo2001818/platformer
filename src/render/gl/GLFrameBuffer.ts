import {GLRenderBuffer} from './GLRenderBuffer';
import {GLRenderer} from './GLRenderer';
import {GLTexture} from './GLTexture';
import {TEXTURE_CUBE_MAP_DIRS} from './GLTextureCube';
import {
  ATTRIBUTE_TYPE_MAP,
  WEBGL1_ATTRIBUTE_TYPE_MAP,
  WEBGL2_TEXTURE_FORMAT_MAP,
} from './utils';

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
  _targets: (GLTexture | GLRenderBuffer)[] = [];
  inferredWidth: number | null = null;
  inferredHeight: number | null = null;

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
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      renderer.boundFrameBuffer = null;
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
    this._refreshSize();
    if (renderer.boundFrameBuffer !== this) {
      const {gl} = renderer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      renderer.boundFrameBuffer = this;
      gl.viewport(0, 0, this.getWidth()!, this.getHeight()!);
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

  _refreshSize(): void {
    const {renderer} = this;
    if (renderer == null) {
      return;
    }
    this._targets.forEach((target) => {
      // If not valid, bind the texture
      if (!target.isValid()) {
        target.bind(renderer);
      }
      this.inferredWidth = target.getWidth();
      this.inferredHeight = target.getHeight();
    });
  }

  _setItem(fbTarget: number, attachment: GLFrameBufferTarget): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    const {gl} = renderer;
    let texWidth: number | null = null;
    let texHeight: number | null = null;
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
      texWidth = inst.getWidth();
      texHeight = inst.getHeight();
      this._targets.push(inst);
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
      texWidth = inst.getWidth();
      texHeight = inst.getHeight();
      this._targets.push(inst);
    } else if (attachment instanceof GLRenderBuffer) {
      attachment.bind(renderer);
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        fbTarget,
        gl.RENDERBUFFER,
        attachment.renderBuffer,
      );
      texWidth = attachment.getWidth();
      texHeight = attachment.getHeight();
      this._targets.push(attachment);
    } else {
      throw new Error('FrameBuffer has received an invalid target object');
    }
    if (this.inferredWidth != null && (
      this.inferredWidth !== texWidth ||
      this.inferredHeight !== texHeight
    )) {
      throw new Error('FrameBuffer has received two different resolutions; ' +
        'The resolution between color, depth, stencil textures must match');
    }
    this.inferredWidth = texWidth;
    this.inferredHeight = texHeight;
  }

  _set(options: GLFrameBufferOptions): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.inferredWidth = null;
    this.inferredHeight = null;
    this._targets = [];
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
    if (this.inferredWidth == null || this.inferredHeight == null) {
      throw new Error('No buffer was specified; If the texture is not loaded' +
        ' yet, wait until the texture is ready.');
    }
    gl.viewport(0, 0, this.inferredWidth, this.inferredHeight);
  }

  set(options: GLFrameBufferOptions): void {
    this.options = options;
    if (this.renderer != null && this.framebuffer != null) {
      this.bind(this.renderer);
      this._set(options);
    }
  }

  getWidth(): number | null {
    return this.inferredWidth;
  }

  getHeight(): number | null {
    return this.inferredHeight;
  }

  readPixels(
    x: number,
    y: number,
    width: number,
    height: number,
    format:
      | 'alpha'
      | 'rgb'
      | 'rgba'
      | 'red'
      | 'rg'
      | 'redInteger'
      | 'rgInteger'
      | 'rgbInteger'
      | 'rgbaInteger',
    type:
      | 'unsignedByte'
      | 'unsignedShort565'
      | 'unsignedShort4444'
      | 'unsignedShort5551'
      | 'float'
      | 'byte'
      | 'unsignedInt2101010'
      | 'halfFloat'
      | 'short'
      | 'unsignedShort'
      | 'int'
      | 'unsignedInt'
      | 'unsignedInt10F11F11F'
      | 'unsignedInt5999',
    pixels: ArrayBufferView,
    dstOffset = 0,
  ): void {
    if (this.renderer == null) {
      throw new Error('Framebuffer must be bound first');
    }
    this.bind(this.renderer);
    const {gl, capabilities} = this.renderer;
    const attributeMap = capabilities.isWebGL2
      ? ATTRIBUTE_TYPE_MAP
      : WEBGL1_ATTRIBUTE_TYPE_MAP;
    gl.readPixels(
      x,
      y,
      width,
      height,
      WEBGL2_TEXTURE_FORMAT_MAP[format],
      attributeMap[type],
      pixels,
      dstOffset,
    );
  }

}
