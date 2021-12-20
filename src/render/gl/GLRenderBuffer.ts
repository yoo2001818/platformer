import {GLRenderer} from './GLRenderer';
import {WEBGL2_TEXTURE_FORMAT_MAP} from './utils';

export interface GLRenderBufferOptions {
  width: number;
  height: number;
  format:
    | 'rgba4'
    | 'rgb565'
    | 'rgb5a1'
    | 'depthComponent16'
    | 'depthComponent24'
    | 'depthComponent32f'
    | 'stencilIndex8'
    | 'depthStencil'
    | 'depth24stencil8'
    | 'depth32fstencil8'
    | 'r8'
    | 'r8ui'
    | 'r8i'
    | 'r16ui'
    | 'r16i'
    | 'r32ui'
    | 'r32i'
    | 'rg8'
    | 'rg8ui'
    | 'rg8i'
    | 'rg16ui'
    | 'rg16i'
    | 'rg32ui'
    | 'rg32i'
    | 'rgb8'
    | 'rgba8'
    | 'srgb8alpha8'
    | 'rgb10a2'
    | 'rgba8ui'
    | 'rgba8i'
    | 'rgb10a2ui'
    | 'rgba16ui'
    | 'rgba16i'
    | 'rgba32i'
    | 'rgba32ui'
    | 'r16f'
    | 'rg16f'
    | 'rgba16f'
    | 'r32f'
    | 'rg32f'
    | 'rgba32f'
    | 'r11g11b10f';
  samples?: number;
}

export class GLRenderBuffer {
  renderer: GLRenderer | null = null;
  renderBuffer: WebGLRenderbuffer | null = null;
  options: GLRenderBufferOptions;
  shouldRefresh = true;

  constructor(options: GLRenderBufferOptions) {
    this.options = options;
  }

  bind(renderer: GLRenderer): void {
    if (this.renderBuffer == null) {
      this.renderer = renderer;
      const {gl} = renderer;
      const renderBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
      this.renderBuffer = renderBuffer;
      renderer.boundRenderBuffer = this;
      this.shouldRefresh = true;
    }
    if (renderer.boundRenderBuffer !== this) {
      const {gl} = renderer;
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
      renderer.boundRenderBuffer = this;
    }
    if (this.shouldRefresh) {
      const {options} = this;
      const {gl, capabilities} = renderer;
      if (capabilities.isWebGL2 && options.samples != null) {
        const gl2 = gl as WebGL2RenderingContext;
        gl2.renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          options.samples,
          WEBGL2_TEXTURE_FORMAT_MAP[options.format],
          options.width,
          options.height,
        );
      } else {
        gl.renderbufferStorage(
          gl.RENDERBUFFER,
          WEBGL2_TEXTURE_FORMAT_MAP[options.format],
          options.width,
          options.height,
        );
      }
      this.shouldRefresh = false;
    }
  }

  updateSize(width: number, height: number): boolean {
    if (
      this.options.width !== width ||
      this.options.height !== height
    ) {
      this.options = {...this.options, width, height};
      this.shouldRefresh = true;
      return true;
    }
    return false;
  }

  dispose(): void {
    if (this.renderBuffer != null) {
      const {renderBuffer, renderer} = this;
      if (renderer == null) {
        return;
      }
      const {gl} = renderer;
      gl.deleteRenderbuffer(renderBuffer);
      this.renderBuffer = null;
      this.shouldRefresh = true;
    }
  }

  getWidth(): number {
    return this.options.width;
  }

  getHeight(): number {
    return this.options.height;
  }

  isValid(): boolean {
    return !this.shouldRefresh;
  }
}
